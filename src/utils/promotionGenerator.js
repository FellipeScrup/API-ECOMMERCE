// src/utils/promotionGenerator.js

const r = require('rethinkdb');

async function generatePromotionsForUser(userId, connection) {
    try {
        // Get user's recent views
        const viewsCursor = await r.table('views')
            .filter({ userId })
            .orderBy(r.desc('timestamp'))
            .limit(10)
            .eqJoin('productId', r.table('products'))
            .zip()
            .run(connection);
        const recentViews = await viewsCursor.toArray();

        // Get user's purchases
        const purchasesCursor = await r.table('purchases')
            .filter({ userId })
            .eqJoin('productId', r.table('products'))
            .zip()
            .run(connection);
        const purchases = await purchasesCursor.toArray();

        // Handle cases where the user has no recent views or purchases
        if (recentViews.length === 0 && purchases.length === 0) {
            console.log(`Usuário ${userId} não tem visualizações ou compras recentes. Nenhuma promoção gerada.`);
            return;
        }

        // Identify categories and products of interest
        const viewedCategories = [...new Set(recentViews.map(view => view.categoria))];
        const purchasedProductIds = purchases.map(purchase => purchase.productId);

        if (viewedCategories.length === 0) {
            console.log(`Usuário ${userId} não tem categorias visualizadas. Nenhuma promoção gerada.`);
            return;
        }

        // Find products in the same categories that the user hasn't purchased
        const potentialPromotionsCursor = await r.table('products')
            .filter(product =>
                r.expr(viewedCategories).contains(product('categoria'))
                .and(r.expr(purchasedProductIds).contains(product('id')).not())
            )
            .limit(5)
            .run(connection);
        const potentialPromotions = await potentialPromotionsCursor.toArray();

        if (potentialPromotions.length === 0) {
            console.log(`Nenhuma promoção disponível para o usuário ${userId}.`);
            return;
        }

        // Create promotion entries
        const promotions = potentialPromotions.map(product => ({
            id: `${userId}_${product.id}`, // Unique ID combining user and product IDs
            userId,
            productId: product.id,
            discount: 10, // For example, a 10% discount
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Valid for 7 days
            timestamp: new Date(),
            motivoPromocao: `Baseado no seu interesse em produtos da categoria ${product.categoria}`
        }));

        // Insert promotions into the database (upsert to avoid duplicates)
        await r.table('promotions').insert(promotions, { conflict: 'replace' }).run(connection);

        console.log(`Promoções geradas para o usuário ${userId}`);
    } catch (error) {
        console.error(`Erro ao gerar promoções para o usuário ${userId}:`, error);
        throw error;
    }
}

async function generatePromotionsForAllUsers(connection) {
    try {
        const usersCursor = await r.table('users').run(connection);
        const users = await usersCursor.toArray();

        for (const user of users) {
            await generatePromotionsForUser(user.id, connection);
        }
    } catch (error) {
        console.error('Erro ao gerar promoções para todos os usuários:', error);
        throw error;
    }
}

module.exports = { generatePromotionsForUser, generatePromotionsForAllUsers };
