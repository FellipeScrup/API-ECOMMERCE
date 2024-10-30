const r = require('rethinkdb');

let connection = null;

async function connect() {
    try {
        connection = await r.connect({
            host: 'localhost',
            port: 28015,
            db: 'ecommerce'
        });
        
        await r.dbCreate('ecommerce').run(connection).catch(() => {});
        
        await r.db('ecommerce').tableCreate('users').run(connection).catch(() => {});
        await r.db('ecommerce').tableCreate('products').run(connection).catch(() => {});
        await r.db('ecommerce').tableCreate('purchases').run(connection).catch(() => {});
        await r.db('ecommerce').tableCreate('views').run(connection).catch(() => {});
        
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

        await r.dbList().contains('ecommerce')
            .do(function(exists) {
                return r.branch(
                    exists,
                    { created: 0 },
                    r.dbCreate('ecommerce')
                );
            }).run(conn);

        await r.db('ecommerce').tableList().contains('products')
            .do(function(exists) {
                return r.branch(
                    exists,
                    { created: 0 },
                    r.db('ecommerce').tableCreate('products')
                );
            }).run(conn);

        console.log('Banco de dados inicializado com sucesso');
        return conn;
    } catch (error) {
        console.error('Erro ao inicializar banco:', error);
        throw error;
    }
}

module.exports = { connect, connection, initDatabase }; 