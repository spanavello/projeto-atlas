const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/img', express.static(path.join(__dirname, 'img')));
app.use(express.static(__dirname));

const BANCO = path.join(__dirname, 'alunos.json');
if (!fs.existsSync(BANCO)) fs.writeFileSync(BANCO, '[]');

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

// ROTA: Adicionar/Renovar Aluno
app.post('/adicionar-aluno', upload.single('foto'), (req, res) => {
    const { nome, senha, dias, cpf, telefone } = req.body;
    let banco = JSON.parse(fs.readFileSync(BANCO, 'utf8'));
    
    // NOVA LÓGICA DE DATAS
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR');
    const horaFormatada = agora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    const msPorDia = parseInt(dias) * 24 * 60 * 60 * 1000;
    
    let aluno = banco.find(a => a.senha === senha);
    
    if (aluno) {
        // Renovação: Atualiza apenas o prazo final e a última entrada
        aluno.prazoFinal = Math.max(Date.now(), aluno.prazoFinal) + msPorDia;
        aluno.ultimaEntrada = `${dataFormatada} às ${horaFormatada}`;
    } else {
        // Novo cadastro
        banco.push({
            id: Date.now().toString(),
            nome: nome.toUpperCase(),
            senha, cpf, telefone,
            prazoFinal: Date.now() + msPorDia,
            dataCadastro: dataFormatada, // DATA ORIGINAL
            ultimaEntrada: `${dataFormatada} às ${horaFormatada}`
        });
    }
    fs.writeFileSync(BANCO, JSON.stringify(banco, null, 2));
    res.json({ success: true });
});

// ROTA: Listar (Adicionado campos de data na resposta)
app.get('/listar-alunos', (req, res) => {
    const banco = JSON.parse(fs.readFileSync(BANCO, 'utf8'));
    const lista = banco.map(a => {
        const diasRestantes = Math.max(0, Math.ceil((a.prazoFinal - Date.now()) / (1000 * 60 * 60 * 24)));
        return { 
            ...a, 
            diasRestantes, 
            status: (a.senha === "00000000000" || diasRestantes > 0) ? "ATIVO" : "INATIVO" 
        };
    });
    res.json(lista);
});

// ROTA: Entrada do Aluno (Atualiza a hora quando ele loga)
app.post('/entrada-aluno', (req, res) => {
    const { senha } = req.body;
    let banco = JSON.parse(fs.readFileSync(BANCO, 'utf8'));
    let aluno = banco.find(a => a.senha === senha);
    
    if (aluno) {
        const agora = new Date();
        aluno.ultimaEntrada = `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`;
        fs.writeFileSync(BANCO, JSON.stringify(banco, null, 2));
        
        const dias = Math.max(0, Math.ceil((aluno.prazoFinal - Date.now()) / (1000 * 60 * 60 * 24)));
        res.json({ success: true, nome: aluno.nome, dias: dias });
    } else { res.json({ success: false }); }
});

app.delete('/remover-aluno/:id', (req, res) => {
    let banco = JSON.parse(fs.readFileSync(BANCO, 'utf8'));
    fs.writeFileSync(BANCO, JSON.stringify(banco.filter(a => a.id !== req.params.id), null, 2));
    res.json({ success: true });
});
// ... (resto do código acima)

// NOVA ROTA: Registrar entrada no Painel de Admin
app.post('/registrar-log', (req, res) => {
    const agora = new Date();
    const dataHora = agora.toLocaleString('pt-BR');
    
    // Onde ficará registrado: um arquivo chamado 'acessos.txt'
    const logFile = path.join(__dirname, 'acessos.txt');
    
    // Formato da linha: [Data e Hora] - Acesso ao Painel
    const linhaLog = `[${dataHora}] - Acesso ao Painel de Controle\n`;
    
    // fs.appendFile adiciona a linha no final do arquivo sem apagar o resto
    fs.appendFile(logFile, linhaLog, (err) => {
        if (err) {
            console.error("Erro ao registrar log:", err);
            return res.status(500).json({ success: false });
        }
        res.json({ success: true });
    });
});

app.listen(3000, () => console.log(" RODANDO"));