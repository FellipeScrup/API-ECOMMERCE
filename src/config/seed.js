const r = require('rethinkdb');

async function seedData() {
    try {
        const conn = await r.connect({
            host: 'localhost',
            port: 28015,
            db: 'ecommerce'
        });

        await r.dbList().contains('ecommerce')
            .do(function(exists) {
                return r.branch(
                    exists,
                    { created: 0 },
                    r.dbCreate('ecommerce')
                );
            }).run(conn);

        const tables = ['users', 'products', 'purchases', 'views'];
        for (const table of tables) {
            await r.db('ecommerce').tableList().contains(table)
                .do(function(exists) {
                    return r.branch(
                        exists,
                        { created: 0 },
                        r.db('ecommerce').tableCreate(table)
                    );
                }).run(conn);
        }

        const produtos = [
            {
                id: '1',
                nome: 'Smartphone Galaxy S21',
                categoria: 'Eletrônicos',
                preco: 3999.99,
                descricao: 'Smartphone Samsung Galaxy S21 128GB',
                tags: ['smartphone', 'samsung', 'android']
            },
            {
                id: '2',
                nome: 'Notebook Dell Inspiron',
                categoria: 'Eletrônicos',
                preco: 4599.99,
                descricao: 'Notebook Dell Inspiron 15 polegadas',
                tags: ['notebook', 'dell', 'computador']
            },
            {
                id: '3',
                nome: 'Tênis Nike Air Max',
                categoria: 'Calçados',
                preco: 599.99,
                descricao: 'Tênis Nike Air Max Preto',
                tags: ['tênis', 'nike', 'esporte']
            }
        ];

        const usuarios = [
            {
                id: '1',
                nome: 'João Silva',
                email: 'joao@email.com',
                dataCadastro: new Date()
            },
            {
                id: '2',
                nome: 'Maria Santos',
                email: 'maria@email.com',
                dataCadastro: new Date()
            },
            {
                id: '3',
                nome: 'Pedro Oliveira',
                email: 'pedro@email.com',
                dataCadastro: new Date()
            }
        ];

        const compras = [
            {
                id: '1',
                userId: '1',
                productId: '1',
                data: new Date(),
                valor: 3999.99
            },
            {
                id: '2',
                userId: '2',
                productId: '2',
                data: new Date(),
                valor: 4599.99
            }
        ];

        await r.table('products').insert(produtos, {conflict: 'replace'}).run(conn);
        await r.table('users').insert(usuarios, {conflict: 'replace'}).run(conn);
        await r.table('purchases').insert(compras, {conflict: 'replace'}).run(conn);

        console.log('Dados inseridos com sucesso');
        await conn.close();
    } catch (error) {
        console.error('Erro:', error);
    }
}

seedData(); 