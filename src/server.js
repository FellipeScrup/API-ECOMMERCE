const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const r = require('rethinkdb');

const app = express();

app.use(cors());
app.use(bodyParser.json());

let connection = null;
r.connect({ host: 'localhost', port: 28015, db: 'ecommerce' })
    .then(conn => {
        connection = conn;
        console.log('Conectado ao RethinkDB');
    })
    .catch(err => console.error('Erro ao conectar:', err));

app.get('/usuarios', async (req, res) => {
    try {
        const cursor = await r.table('users').run(connection);
        const usuarios = await cursor.toArray();
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

app.get('/produtos', async (req, res) => {
    try {
        const cursor = await r.table('products').run(connection);
        const produtos = await cursor.toArray();
        res.json(produtos);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

app.get('/compras', async (req, res) => {
    try {
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
        
        if (!userId || !productId) {
            return res.status(400).json({ error: 'userId e productId são obrigatórios' });
        }

        const view = {
            userId: userId.toString(),
            productId: productId.toString(),
            timestamp: new Date(),
            tempoVisualizacao: tempoVisualizacao || 0
        };

        await r.table('views').insert(view).run(connection);
        res.json({ message: 'Visualização registrada com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao registrar visualização' });
    }
});

app.get('/recomendacoes/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const viewsCursor = await r.table('views')
            .filter({ userId })
            .orderBy(r.desc('timestamp'))
            .limit(5)
            .eqJoin('productId', r.table('products'))
            .zip()
            .run(connection);

        const visualizacoesRecentes = await viewsCursor.toArray();
        const categoriasRecentes = visualizacoesRecentes.map(v => v.categoria);

        const produtosSimilaresCursor = await r.table('products')
            .filter(function(produto) {
                return r.expr(categoriasRecentes).contains(produto('categoria'))
                    .and(r.expr(visualizacoesRecentes.map(v => v.productId))
                    .contains(produto('id')).not());
            })
            .limit(5)
            .run(connection);

        const produtosSimilares = await produtosSimilaresCursor.toArray();
        const precoMedio = visualizacoesRecentes.reduce((acc, curr) => acc + curr.preco, 0) / visualizacoesRecentes.length;
        const faixaPrecoMin = precoMedio * 0.7;
        const faixaPrecoMax = precoMedio * 1.3;

        const produtosFaixaPrecoCursor = await r.table('products')
            .filter(function(produto) {
                return produto('preco').ge(faixaPrecoMin)
                    .and(produto('preco').le(faixaPrecoMax))
                    .and(r.expr(visualizacoesRecentes.map(v => v.productId))
                    .contains(produto('id')).not());
            })
            .limit(3)
            .run(connection);

        const produtosFaixaPreco = await produtosFaixaPrecoCursor.toArray();

        const recomendacaoFinal = {
            userId,
            timestamp: new Date(),
            visualizacoesRecentes: visualizacoesRecentes.map(v => ({
                id: v.id,
                nome: v.nome,
                categoria: v.categoria,
                preco: v.preco,
                timestamp: v.timestamp
            })),
            recomendacoes: {
                produtosSimilares: produtosSimilares.map(p => ({
                    id: p.id,
                    nome: p.nome,
                    categoria: p.categoria,
                    preco: p.preco,
                    motivoRecomendacao: `Baseado em sua visualização de produtos da categoria ${p.categoria}`
                })),
                produtosFaixaPreco: produtosFaixaPreco.map(p => ({
                    id: p.id,
                    nome: p.nome,
                    categoria: p.categoria,
                    preco: p.preco,
                    motivoRecomendacao: `Produto com preço similar aos que você visualizou`
                }))
            },
            estatisticas: {
                totalVisualizacoes: visualizacoesRecentes.length,
                categoriasVisualizadas: [...new Set(categoriasRecentes)].length,
                faixaPreco: {
                    minimo: faixaPrecoMin,
                    maximo: faixaPrecoMax,
                    medio: precoMedio
                }
            }
        };

        res.json(recomendacaoFinal);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao gerar recomendações' });
    }
});

app.post('/produtos', async (req, res) => {
    try {
        const { nome, categoria, preco, descricao, tags } = req.body;
        
        if (!nome || !categoria || !preco) {
            return res.status(400).json({ error: 'Nome, categoria e preço são obrigatórios' });
        }

        const produto = {
            id: Date.now().toString(),
            nome,
            categoria,
            preco,
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
}); 