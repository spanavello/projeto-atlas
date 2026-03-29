CREATE DATABASE IF NOT EXISTS projeto_atlas;
USE projeto_atlas;

CREATE TABLE IF NOT EXISTS alunos (
    id VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    senha VARCHAR(20) UNIQUE NOT NULL,
    cpf VARCHAR(14),
    telefone VARCHAR(20),
    prazoFinal BIGINT,
    dataCadastro VARCHAR(10),
    ultimaEntrada VARCHAR(30)
);


INSERT INTO alunos (id, nome, senha, cpf, telefone, prazoFinal, dataCadastro) 
VALUES ('1', 'ADMIN', '123456', '00000000000', '53991658384', 1804678297913, '01/03/2026')
ON DUPLICATE KEY UPDATE nome=nome;