const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// CONFIGURAÇÕES DE SEGURANÇA
// ===============================

// Headers de segurança
app.use(helmet());

// Limita tamanho do JSON recebido
app.use(express.json({ limit: "20kb" }));

// Domínios permitidos
const allowedOrigins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://localhost:3000"
];

// Adiciona domínio de produção se existir no .env
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(
    cors({
        origin: function (origin, callback) {
            // Permite requisições sem origin em testes locais / ferramentas
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error("Origem não permitida pelo CORS."));
        },
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"]
    })
);

// Limite de requisições para evitar spam
const leadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        sucesso: false,
        mensagem:
            "Muitas solicitações foram enviadas. Aguarde alguns minutos e tente novamente."
    }
});

// ===============================
// NODEMAILER
// ===============================

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// ===============================
// FUNÇÕES AUXILIARES
// ===============================

function limparTexto(valor, tamanhoMaximo = 500) {
    if (typeof valor !== "string") {
        return "";
    }

    return valor
        .trim()
        .replace(/[<>]/g, "")
        .slice(0, tamanhoMaximo);
}

function emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function telefoneValido(telefone) {
    const numeros = telefone.replace(/\D/g, "");
    return numeros.length >= 10 && numeros.length <= 11;
}

// ===============================
// ROTA DE TESTE
// ===============================

app.get("/", (req, res) => {
    res.status(200).json({
        sucesso: true,
        mensagem: "Backend da Consult Saúde funcionando!"
    });
});

// ===============================
// ROTA DE LEADS
// ===============================

app.post("/api/leads", leadLimiter, async (req, res) => {
    try {
        const nome = limparTexto(req.body.nome, 100);
        const email = limparTexto(req.body.email, 150).toLowerCase();
        const telefone = limparTexto(req.body.telefone, 30);
        const idades = limparTexto(req.body.idades, 150);
        const possuiCnpj = limparTexto(req.body.possuiCnpj, 10);
        const possuiPlano = limparTexto(req.body.possuiPlano, 10);
        const operadoraAtual = limparTexto(req.body.operadoraAtual, 100);
        const preferencias = limparTexto(req.body.preferencias, 500);
        const origem = limparTexto(req.body.origem, 100) || "Site";

        console.log("\n========================================");
        console.log("NOVO LEAD RECEBIDO");
        console.log("========================================");
        console.log("Nome:", nome);
        console.log("Origem:", origem);
        console.log("Horário:", new Date().toISOString());
        console.log("========================================");

        // Campos obrigatórios
        if (
            !nome ||
            !email ||
            !telefone ||
            !idades ||
            !possuiCnpj ||
            !possuiPlano
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Preencha todos os campos obrigatórios."
            });
        }

        // Validação de e-mail
        if (!emailValido(email)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Informe um e-mail válido."
            });
        }

        // Validação de telefone
        if (!telefoneValido(telefone)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Informe um telefone válido com DDD."
            });
        }

        // Validação dos radios
        const respostasValidas = ["Sim", "Não"];

        if (!respostasValidas.includes(possuiCnpj)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Resposta inválida para CNPJ."
            });
        }

        if (!respostasValidas.includes(possuiPlano)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Resposta inválida para plano de saúde."
            });
        }

        const dataHora = new Date().toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo"
        });

        const assunto = `NOVO LEAD - ${nome} - Consult Saúde`;

        const mensagem = `
NOVO LEAD - CONSULT SAÚDE
========================================

Data e hora:
${dataHora}

Origem:
${origem}

DADOS DO CLIENTE
========================================

Nome:
${nome}

E-mail:
${email}

Telefone:
${telefone}

Idades:
${idades}

Possui CNPJ:
${possuiCnpj}

Possui plano de saúde atualmente:
${possuiPlano}

Operadora atual:
${operadoraAtual || "Não informado"}

Laboratórios/Hospitais de preferência:
${preferencias || "Não informado"}

========================================

Lead recebido através do site
Consult Saúde - Seguros e Planos de Saúde
`;

        console.log("Preparando envio do e-mail...");

        const info = await transporter.sendMail({
            from: `"Site Consult Saúde" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_DESTINO,
            replyTo: email,
            subject: assunto,
            text: mensagem
        });

        console.log("E-mail enviado com sucesso.");
        console.log("Message ID:", info.messageId);
        console.log("========================================\n");

        return res.status(200).json({
            sucesso: true,
            mensagem:
                "Solicitação enviada com sucesso! Em breve entraremos em contato."
        });
    } catch (erro) {
        console.error("\nERRO AO PROCESSAR LEAD");
        console.error("Mensagem:", erro.message);
        console.error("Código:", erro.code || "Sem código");
        console.error("========================================\n");

        return res.status(500).json({
            sucesso: false,
            mensagem:
                "Não foi possível enviar sua solicitação neste momento. Tente novamente mais tarde."
        });
    }
});

// ===============================
// ROTA NÃO ENCONTRADA
// ===============================

app.use((req, res) => {
    res.status(404).json({
        sucesso: false,
        mensagem: "Rota não encontrada."
    });
});

// ===============================
// INICIALIZAÇÃO
// ===============================

app.listen(PORT,  "0.0.0.0", () => {
    console.log("========================================");
    console.log("CONSULT SAÚDE - BACKEND");
    console.log("========================================");
    console.log(`Servidor iniciado na porta ${PORT}`);
    console.log(`Ambiente: ${process.env.NODE_ENV || "development"}`);
    console.log("Aguardando novos leads...");
    console.log("========================================");
});