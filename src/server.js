const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const r = require('rethinkdb');
const app = express();
const { connect, initDatabase } = require('./config/database');
const { seedData } = require('./config/seed');
const cron = require('node-cron');
const { generatePromotionsForUser, generatePromotionsForAllUsers } = require('./utils/promotionGenerator');

cron.schedule('0 0 * * *', async () => {
    console.log('Iniciando geração diária de promoções...');
    try {
        const connection = app.locals.connection;
        await generatePromotionsForAllUsers(connection);
        console.log('Geração diária de promoções concluída.');
    } catch (error) {
        console.error('Erro ao gerar promoções diárias:', error);
    }
});

app.use(cors());
app.use(bodyParser.json());

(async () => {
    try {
        await initDatabase();
        await seedData();
        const connection = await connect();
        app.locals.connection = connection;
        console.log('Servidor conectado ao banco de dados e pronto para receber solicitações.');

        let PORT = process.env.PORT || 3001;
        let server;

        function startServer(port) {
            server = app.listen(port)
                .on('error', (err) => {
                    if (err.code === 'EADDRINUSE') {
                        console.log(`Porta ${port} já está em uso. Tentando porta ${port + 1}...`);
                        startServer(port + 1);
                    } else {
                        console.error('Erro ao iniciar o servidor:', err);
                    }
                })
                .on('listening', () => {
                    console.log(`Servidor rodando na porta ${server.address().port}`);
                });
        }

        startServer(PORT);

    } catch (error) {
        console.error('Erro ao inicializar o servidor:', error);
    }
})();

app.get('/usuarios', async (req, res) => {
    try {
        const connection = app.locals.connection;
        const cursor = await r.table('users').run(connection);
        const usuarios = await cursor.toArray();
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

app.get('/promocoes/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const connection = app.locals.connection;

        const promotionsCursor = await r.table('promotions')
            .filter({ userId })
            .eqJoin('productId', r.table('products'))
            .zip()
            .run(connection);
        const promotions = await promotionsCursor.toArray();

        res.json(promotions.map(promo => ({
            promotionId: promo.id,
            productId: promo.productId,
            productName: promo.nome,
            categoria: promo.categoria,
            discount: promo.discount,
            validUntil: promo.validUntil,
            motivoPromocao: promo.motivoPromocao
        })));
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar promoções' });
    }
});

app.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Query parameter q is required' });
        }
        const connection = app.locals.connection;
        const productsCursor = await r.table('products')
            .filter(product =>
                product('nome').match(`(?i)${q}`)
                .or(product('descricao').match(`(?i)${q}`))
                .or(product('tags').contains(tag => tag.match(`(?i)${q}`)))
            )
            .run(connection);
        const products = await productsCursor.toArray();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao realizar busca' });
    }
});

app.get('/produtos', async (req, res) => {
    try {
        const connection = app.locals.connection;
        const cursor = await r.table('products').run(connection);
        const produtos = await cursor.toArray();
        res.json(produtos);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

app.get('/compras', async (req, res) => {
    try {
        const connection = app.locals.connection;
        const cursor = await r.table('purchases')
            .eqJoin('userId', r.table('users'))
            .zip()
            .eqJoin('productId', r.table('products'))
            .zip()
            .run(connection);
        const compras = await cursor.toArray();
        res.json(compras);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar compras' });
    }
});

app.get('/views', async (req, res) => {
    try {
        const connection = app.locals.connection;
        const cursor = await r.table('views')
            .eqJoin('userId', r.table('users'))
            .zip()
            .eqJoin('productId', r.table('products'))
            .zip()
            .run(connection);
        const views = await cursor.toArray();
        res.json(views);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar visualizações' });
    }
});

app.post('/views', async (req, res) => {
    try {
        const { userId, productId, tempoVisualizacao } = req.body;

        if (!userId || !productId || tempoVisualizacao == null) {
            return res.status(400).json({ error: 'userId, productId, e tempoVisualizacao são obrigatórios' });
        }

        const connection = app.locals.connection;
        const view = {
            id: Date.now().toString(),
            userId: userId.toString(),
            productId: productId.toString(),
            timestamp: new Date(),
            tempoVisualizacao: Number(tempoVisualizacao)
        };

        await r.table('views').insert(view).run(connection);

        await generatePromotionsForUser(userId.toString(), connection);

        res.json({ message: 'Visualização registrada e promoções atualizadas com sucesso' });
    } catch (error) {
        console.error('Erro ao registrar visualização e gerar promoções:', error); // Log the detailed error
        res.status(500).json({ error: 'Erro ao registrar visualização e gerar promoções' });
    }
});

app.get('/recomendacoes/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const connection = app.locals.connection;

        const userViewsCursor = await r.table('views')
            .filter({ userId })
            .orderBy(r.desc('timestamp'))
            .limit(10)
            .run(connection);
        const userViews = await userViewsCursor.toArray();

        const viewedProductIds = userViews.map(view => view.productId);
        const totalViewTime = userViews.reduce((acc, view) => acc + view.tempoVisualizacao, 0);

        // Get categories and tags from products the user viewed
        const viewedProductsCursor = await r.table('products')
            .getAll(r.args(viewedProductIds))
            .run(connection);
        const viewedProducts = await viewedProductsCursor.toArray();

        const categoriesViewed = [...new Set(viewedProducts.map(p => p.categoria))];
        const tagsViewed = [...new Set(viewedProducts.flatMap(p => p.tags))];

        const similarUsersCursor = await r.table('views')
            .filter(view => r.expr(viewedProductIds).contains(view('productId')).and(view('userId').ne(userId)))
            .pluck('userId')
            .distinct()
            .run(connection);
        const similarUsers = await similarUsersCursor.toArray();
        const similarUserIds = similarUsers.map(u => u.userId);

        if (similarUserIds.length === 0) {
            return res.json({
                userId,
                timestamp: new Date(),
                recomendacoes: [],
                message: 'Nenhum usuário similar encontrado para gerar recomendações.'
            });
        }

        const recommendedViewsCursor = await r.table('views')
            .filter(view => r.expr(similarUserIds).contains(view('userId'))
                .and(r.expr(viewedProductIds).contains(view('productId')).not()))
            .run(connection);
        const recommendedViews = await recommendedViewsCursor.toArray();

        const recommendedProductIds = [...new Set(recommendedViews.map(view => view.productId))];

        const recommendedProductsCursor = await r.table('products')
            .getAll(r.args(recommendedProductIds))
            .filter(product =>
                r.expr(categoriesViewed).contains(product('categoria'))
                .or(product('tags').contains(tag => r.expr(tagsViewed).contains(tag)))
            )
            .limit(10)
            .run(connection);
        const recommendedProducts = await recommendedProductsCursor.toArray();
        const productScores = {};
        recommendedViews.forEach(view => {
            if (!productScores[view.productId]) {
                productScores[view.productId] = { frequency: 0, totalTime: 0 };
            }
            productScores[view.productId].frequency += 1;
            productScores[view.productId].totalTime += view.tempoVisualizacao;
        });

        recommendedProducts.forEach(product => {
            const scoreData = productScores[product.id];
            if (scoreData) {
                product.score = scoreData.frequency * scoreData.totalTime;
            } else {
                product.score = 0;
            }
        });
        recommendedProducts.sort((a, b) => b.score - a.score);

        res.json({
            userId,
            timestamp: new Date(),
            recomendacoes: recommendedProducts.map(p => ({
                id: p.id,
                nome: p.nome,
                categoria: p.categoria,
                preco: p.preco,
                motivoRecomendacao: `Usuários similares visualizaram este produto por ${productScores[p.id].totalTime} segundos no total`,
                score: p.score
            }))
        });
    } catch (error) {
        console.error('Erro ao gerar recomendações:', error);
        res.status(500).json({ error: 'Erro ao gerar recomendações' });
    }
});

app.get('/users/:userId/views', async (req, res) => {
    try {
        const userId = req.params.userId;
        const connection = app.locals.connection;

        const viewsCursor = await r.table('views')
            .filter({ userId })
            .eqJoin('productId', r.table('products'))
            .zip()
            .orderBy(r.desc('timestamp'))
            .run(connection);

        const views = await viewsCursor.toArray();

        res.json(views.map(view => ({
            productId: view.productId,
            productName: view.nome,
            categoria: view.categoria,
            tempoVisualizacao: view.tempoVisualizacao,
            timestamp: view.timestamp
        })));
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar histórico de visualizações' });
    }
});

app.post('/produtos', async (req, res) => {
    try {
        const { nome, categoria, preco, descricao, tags } = req.body;

        if (!nome || !categoria || preco == null) {
            return res.status(400).json({ error: 'Nome, categoria e preço são obrigatórios' });
        }

        const connection = app.locals.connection;
        const produto = {
            id: Date.now().toString(),
            nome,
            categoria,
            preco: Number(preco),
            descricao: descricao || '',
            tags: tags || []
        };

        await r.table('products').insert(produto).run(connection);
        res.status(201).json({
            message: 'Produto adicionado com sucesso',
            produto
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao adicionar produto' });
    }
});
