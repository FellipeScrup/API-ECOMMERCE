const express = require('express');
const router = express.Router();
const r = require('rethinkdb');
const { connection } = require('../config/database');

router.get('/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const purchases = await r.table('purchases')
            .filter({ userId: userId })
            .run(connection);
        
        const recommendations = await r.table('products')
            .filter(product => 
                r.table('purchases')
                    .filter({ userId: userId })
                    .map(purchase => purchase('categoryId'))
                    .contains(product('categoryId'))
            )
            .limit(10)
            .run(connection);
            
        res.json(recommendations);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar recomendações' });
    }
});

router.get('/popular', async (req, res) => {
    try {
        const popularProducts = await r.table('purchases')
            .group('productId')
            .count()
            .ungroup()
            .orderBy(r.desc('reduction'))
            .limit(10)
            .run(connection);
            
        res.json(popularProducts);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar produtos populares' });
    }
});

router.get('/user/:userId/recommendations', async (req, res) => {
    try {
        const userId = req.params.userId;
        const viewedProducts = await r.table('views')
            .filter({ userId: userId })
            .orderBy(r.desc('data'))
            .limit(5)
            .eqJoin('productId', r.table('products'))
            .zip()
            .run(connection);
        
        const recommendations = await r.table('products')
            .filter(function(product) {
                return r.expr(viewedProducts.map(p => p.categoria))
                    .contains(product('categoria'))
                    .and(r.expr(viewedProducts.map(p => p.id))
                    .contains(product('id')).not());
            })
            .limit(5)
            .run(connection);
            
        res.json({
            recentlyViewed: await viewedProducts.toArray(),
            recommended: await recommendations.toArray()
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar recomendações' });
    }
});

router.get('/user/:userId/promotions', async (req, res) => {
    try {
        const userId = req.params.userId;
        const userPreferences = await r.table('views')
            .filter({ userId: userId })
            .eqJoin('productId', r.table('products'))
            .zip()
            .group('categoria')
            .count()
            .ungroup()
            .orderBy(r.desc('reduction'))
            .limit(3)
            .run(connection);
        
        const promotions = await r.table('products')
            .filter(function(product) {
                return r.expr(userPreferences.map(p => p.group))
                    .contains(product('categoria'));
            })
            .merge(function(product) {
                return {
                    precoPromocional: product('preco').mul(0.85),
                    validadePromocao: r.now().add(7*24*60*60)
                };
            })
            .limit(5)
            .run(connection);
            
        res.json({
            preferences: await userPreferences.toArray(),
            promotions: await promotions.toArray()
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar promoções' });
    }
});

router.post('/view', async (req, res) => {
    try {
        const { userId, productId, tempoVisualizacao } = req.body;
        
        const view = {
            userId,
            productId,
            data: new Date(),
            tempoVisualizacao
        };
        
        await r.table('views').insert(view).run(connection);
        
        res.json({ message: 'Visualização registrada com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao registrar visualização' });
    }
});

router.get('/trending', async (req, res) => {
    try {
        const trending = await r.table('views')
            .group('productId')
            .count()
            .ungroup()
            .orderBy(r.desc('reduction'))
            .limit(10)
            .eqJoin('group', r.table('products'), { index: 'id' })
            .zip()
            .run(connection);
            
        res.json(await trending.toArray());
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar tendências' });
    }
});

module.exports = router;