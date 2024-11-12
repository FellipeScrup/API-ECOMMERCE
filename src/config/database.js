const r = require('rethinkdb');

async function connect() {
    try {
        const connection = await r.connect({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 28015,
            db: process.env.DB_NAME || 'ecommerce'
        });
        console.log('Conexão com RethinkDB estabelecida');
        return connection;
    } catch (error) {
        console.error('Erro ao conectar com RethinkDB:', error);
        throw error;
    }
}

async function initDatabase() {
    try {
        const conn = await r.connect({
            host: 'localhost',
            port: 28015
        });

        // Create database if it doesn't exist
        await r.dbList().contains('ecommerce')
            .do(function (exists) {
                return r.branch(
                    exists,
                    { created: 0 },
                    r.dbCreate('ecommerce')
                );
            }).run(conn);

        // Create tables if they don't exist
        // In initDatabase function
        const tables = ['users', 'products', 'purchases', 'views', 'promotions'];
        for (const table of tables) {
            await r.db('ecommerce').tableList().contains(table)
                .do(function (exists) {
                    return r.branch(
                        exists,
                        { created: 0 },
                        r.db('ecommerce').tableCreate(table)
                    );
                }).run(conn);
        }

        console.log('Banco de dados inicializado com sucesso');
        await conn.close();
    } catch (error) {
        console.error('Erro ao inicializar banco:', error);
        throw error;
    }
}

module.exports = { connect, initDatabase };
