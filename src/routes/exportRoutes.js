const express = require('express');
const router = express.Router();
const r = require('rethinkdb');
const fs = require('fs').promises;
const path = require('path');
const { connection } = require('../config/database');

router.get('/export', async (req, res) => {
    try {
        const dados = {
            produtos: await r.table('products').run(connection).then(cursor => cursor.toArray()),
            usuarios: await r.table('users').run(connection).then(cursor => cursor.toArray()),
            compras: await r.table('purchases').run(connection).then(cursor => cursor.toArray()),
            visualizacoes: await r.table('views').run(connection).then(cursor => cursor.toArray())
        };

        dados.estatisticas = {
            totalProdutos: dados.produtos.length,
            totalUsuarios: dados.usuarios.length,
            totalCompras: dados.compras.length,
            totalVisualizacoes: dados.visualizacoes.length,
            valorTotalCompras: dados.compras.reduce((total, compra) => total + compra.valor, 0),
            produtosMaisVistos: await r.table('views')
                .group('productId')
                .count()
                .ungroup()
                .orderBy(r.desc('reduction'))
                .limit(5)
                .run(connection)
                .then(cursor => cursor.toArray())
        };

        const dataHora = new Date().toISOString().replace(/[:.]/g, '-');
        const nomeArquivo = `export-${dataHora}.json`;
        const caminhoArquivo = path.join(__dirname, '..', '..', 'exports', nomeArquivo);

        await fs.mkdir(path.join(__dirname, '..', '..', 'exports'), { recursive: true });

        await fs.writeFile(
            caminhoArquivo, 
            JSON.stringify(dados, null, 2),
            'utf8'
        );

        res.download(caminhoArquivo, nomeArquivo, (err) => {
            if (err) {
                console.error('Erro ao enviar arquivo:', err);
                res.status(500).json({ error: 'Erro ao enviar arquivo' });
            }
        });

    } catch (error) {
        console.error('Erro na exportação:', error);
        res.status(500).json({ error: 'Erro ao exportar dados' });
    }
});

router.get('/export/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        const dadosUsuario = {
            usuario: await r.table('users')
                .get(userId)
                .run(connection),
            compras: await r.table('purchases')
                .filter({ userId })
                .run(connection)
                .then(cursor => cursor.toArray()),
            visualizacoes: await r.table('views')
                .filter({ userId })
                .run(connection)
                .then(cursor => cursor.toArray()),
            recomendacoes: await r.table('views')
                .filter({ userId })
                .eqJoin('productId', r.table('products'))
                .zip()
                .run(connection)
                .then(cursor => cursor.toArray())
        };

        const nomeArquivo = `user-${userId}-export-${Date.now()}.json`;
        const caminhoArquivo = path.join(__dirname, '..', '..', 'exports', nomeArquivo);

        await fs.mkdir(path.join(__dirname, '..', '..', 'exports'), { recursive: true });

        await fs.writeFile(
            caminhoArquivo,
            JSON.stringify(dadosUsuario, null, 2),
            'utf8'
        );

        res.download(caminhoArquivo, nomeArquivo);

    } catch (error) {
        console.error('Erro na exportação:', error);
        res.status(500).json({ error: 'Erro ao exportar dados do usuário' });
    }
});

module.exports = router;