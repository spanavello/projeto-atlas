require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const mysql = require('mysql2');

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.use('/img', express.static(path.join(__dirname, 'img')));
app.use(express.static(__dirname));


const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

db.connect((err) => {
    if (err) {
        console.error("ERRO AO CONECTAR AO MYSQL: ", err.message);
        return;
    }
    console.log("SÁBIO, O ATLAS ESTÁ CONECTADO AO MYSQL!");
});


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './img/alunos/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        
        cb(null, req.body.senha + '.jpg');
    }
});
const upload = multer({ storage: storage });


app.post('/adicionar-aluno', upload.single('foto'), (req, res) => {
    const { nome, senha, dias, cpf, telefone } = req.body;
    const msPorDia = parseInt(dias) * 24 * 60 * 60 * 1000;
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR');
    const horaFormatada = agora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    
    // SQL inteligente: Insere novo ou atualiza se a senha (UNIQUE) já existir
    const sql = `
        INSERT INTO alunos (id, nome, senha, cpf, telefone, prazoFinal, dataCadastro, ultimaEntrada)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            prazoFinal = IF(prazoFinal > UNIX_TIMESTAMP()*1000, prazoFinal + ?, UNIX_TIMESTAMP()*1000 + ?),
            ultimaEntrada = ?
    `;

    const id = Date.now().toString();
    const valores = [id, nome.toUpperCase(), senha, cpf, telefone, Date.now() + msPorDia, dataFormatada, `${dataFormatada} às ${horaFormatada}`, msPorDia, msPorDia, `${dataFormatada} às ${horaFormatada}`];

    db.query(sql, valores, (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});


app.get('/listar-alunos', (req, res) => {
    db.query("SELECT * FROM alunos", (err, results) => {
        if (err) return res.status(500).json(err);
        
        const agora = Date.now();
        const lista = results.map(a => {
            const diasRestantes = Math.max(0, Math.ceil((a.prazoFinal - agora) / (1000 * 60 * 60 * 24)));
            return { 
                ...a, 
                diasRestantes, 
                status: (a.senha === "00000000000" || diasRestantes > 0) ? "ATIVO" : "INATIVO" 
            };
        });
        res.json(lista);
    });
});


app.post('/entrada-aluno', (req, res) => {
    const { senha } = req.body;
    const sql = "SELECT * FROM alunos WHERE senha = ?";
    
    db.query(sql, [senha], (err, results) => {
        if (err || results.length === 0) return res.json({ success: false });

        const aluno = results[0];
        const agora = new Date();
        const ultimaEntrada = `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`;

        
        db.query("UPDATE alunos SET ultimaEntrada = ? WHERE id = ?", [ultimaEntrada, aluno.id]);

        const dias = Math.max(0, Math.ceil((aluno.prazoFinal - Date.now()) / (1000 * 60 * 60 * 24)));
        res.json({ success: true, nome: aluno.nome, dias: dias });
    });
});


app.delete('/remover-aluno/:id', (req, res) => {
    db.query("DELETE FROM alunos WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});


app.post('/registrar-log', (req, res) => {
    const logFile = path.join(__dirname, 'acessos.txt');
    const linhaLog = `[${new Date().toLocaleString('pt-BR')}] - Acesso ao Painel de Controle\n`;
    fs.appendFile(logFile, linhaLog, (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`O OLIMPO ESTÁ RODANDO NA PORTA ${PORT}`));