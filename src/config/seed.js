const r = require('rethinkdb');

async function seedData() {
    try {
        const conn = await r.connect({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 28015,
            db: process.env.DB_NAME || 'ecommerce'
        });

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
            },
            // Added more products
            {
                id: '4',
                nome: 'Camisa Polo Ralph Lauren',
                categoria: 'Vestuário',
                preco: 299.99,
                descricao: 'Camisa Polo Ralph Lauren Azul',
                tags: ['camisa', 'polo', 'vestuário']
            },
            {
                id: '5',
                nome: 'Fone de Ouvido Bluetooth JBL',
                categoria: 'Eletrônicos',
                preco: 199.99,
                descricao: 'Fone de Ouvido JBL Sem Fio',
                tags: ['fone', 'jbl', 'bluetooth']
            },
            {
                id: '6',
                nome: 'Câmera Canon EOS Rebel T7',
                categoria: 'Eletrônicos',
                preco: 2499.99,
                descricao: 'Câmera DSLR Canon EOS Rebel T7',
                tags: ['câmera', 'canon', 'fotografia']
            },
            {
                id: '7',
                nome: 'Livro: JavaScript Avançado',
                categoria: 'Livros',
                preco: 89.99,
                descricao: 'Livro sobre JavaScript para Desenvolvedores Avançados',
                tags: ['livro', 'javascript', 'programação']
            },
            {
                id: '8',
                nome: 'Cafeteira Expresso Nespresso',
                categoria: 'Eletrodomésticos',
                preco: 499.99,
                descricao: 'Cafeteira Nespresso Inissia',
                tags: ['cafeteira', 'nespresso', 'café']
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
            },
            // Added more users
            {
                id: '4',
                nome: 'Ana Pereira',
                email: 'ana@email.com',
                dataCadastro: new Date()
            },
            {
                id: '5',
                nome: 'Carlos Eduardo',
                email: 'carlos@email.com',
                dataCadastro: new Date()
            },
            {
                id: '6',
                nome: 'Fernanda Gomes',
                email: 'fernanda@email.com',
                dataCadastro: new Date()
            },
            {
                id: '7',
                nome: 'Lucas Lima',
                email: 'lucas@email.com',
                dataCadastro: new Date()
            },
            {
                id: '8',
                nome: 'Mariana Costa',
                email: 'mariana@email.com',
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
            },
            // Added more purchases
            {
                id: '3',
                userId: '4',
                productId: '3',
                data: new Date(),
                valor: 599.99
            },
            {
                id: '4',
                userId: '5',
                productId: '5',
                data: new Date(),
                valor: 199.99
            },
            {
                id: '5',
                userId: '6',
                productId: '4',
                data: new Date(),
                valor: 299.99
            },
            {
                id: '6',
                userId: '7',
                productId: '7',
                data: new Date(),
                valor: 89.99
            },
            {
                id: '7',
                userId: '8',
                productId: '8',
                data: new Date(),
                valor: 499.99
            }
        ];

        const visualizacoes = [
            {
                id: '1',
                userId: '1',
                productId: '2',
                timestamp: new Date(),
                tempoVisualizacao: 120 // in seconds
            },
            {
                id: '2',
                userId: '1',
                productId: '5',
                timestamp: new Date(),
                tempoVisualizacao: 45
            },
            {
                id: '3',
                userId: '2',
                productId: '1',
                timestamp: new Date(),
                tempoVisualizacao: 90
            },
            {
                id: '4',
                userId: '3',
                productId: '4',
                timestamp: new Date(),
                tempoVisualizacao: 60
            },
            {
                id: '5',
                userId: '4',
                productId: '3',
                timestamp: new Date(),
                tempoVisualizacao: 75
            },
            {
                id: '6',
                userId: '5',
                productId: '6',
                timestamp: new Date(),
                tempoVisualizacao: 180
            },
            {
                id: '7',
                userId: '6',
                productId: '8',
                timestamp: new Date(),
                tempoVisualizacao: 30
            },
            {
                id: '8',
                userId: '7',
                productId: '7',
                timestamp: new Date(),
                tempoVisualizacao: 150
            },
            {
                id: '9',
                userId: '8',
                productId: '2',
                timestamp: new Date(),
                tempoVisualizacao: 200
            }
        ];

        await r.table('products').insert(produtos, { conflict: 'replace' }).run(conn);
        await r.table('users').insert(usuarios, { conflict: 'replace' }).run(conn);
        await r.table('purchases').insert(compras, { conflict: 'replace' }).run(conn);
        await r.table('views').insert(visualizacoes, { conflict: 'replace' }).run(conn);

        console.log('Dados inseridos com sucesso');
        await conn.close();
    } catch (error) {
        console.error('Erro ao inserir dados:', error);
    }
}

module.exports = { seedData };
