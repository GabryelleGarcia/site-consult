const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

app.get("/", (req, res) => {
    res.json({
        sucesso: true,
        mensagem: "Backend da Consult Saúde funcionando!"
    });
});

app.post("/api/leads", async (req, res) => {
    try {
        const {
            nome,
            email,
            telefone,
            idades,
            possuiCnpj,
            possuiPlano,
            operadoraAtual,
            preferencias,
            origem
        } = req.body;

        console.log("\n========================================");
        console.log("NOVO LEAD RECEBIDO");
        console.log("========================================");
        console.log("Nome:", nome);
        console.log("E-mail:", email);
        console.log("Telefone:", telefone);
        console.log("Origem:", origem || "Site");
        console.log("========================================");

        if (
            !nome ||
            !email ||
            !telefone ||
            !idades ||
            !possuiCnpj ||
            !possuiPlano
        ) {
            console.log("❌ Lead recusado: campos obrigatórios ausentes.");

            return res.status(400).json({
                sucesso: false,
                mensagem: "Preencha todos os campos obrigatórios."
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
${origem || "Site"}

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

        console.log("📨 Preparando envio do e-mail...");

        const info = await transporter.sendMail({
            from: `"Site Consult Saúde" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_DESTINO,
            replyTo: email,
            subject: assunto,
            text: mensagem
        });

        console.log("✅ E-mail enviado com sucesso!");
        console.log("ID da mensagem:", info.messageId);
        console.log("Destinatário:", process.env.EMAIL_DESTINO);
        console.log("Data:", dataHora);
        console.log("========================================\n");

        return res.status(200).json({
            sucesso: true,
            mensagem: "Lead enviado com sucesso!"
        });

    } catch (erro) {
        console.error("\n❌ ERRO AO ENVIAR LEAD");
        console.error("Mensagem:", erro.message);
        console.error("Código:", erro.code || "Sem código");
        console.error("========================================\n");

        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno ao processar o lead."
        });
    }
});

app.listen(PORT, () => {
    console.log("========================================");
    console.log("CONSULT SAÚDE - BACKEND");
    console.log("========================================");
    console.log(`Servidor iniciado na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
    console.log("Aguardando novos leads...");
    console.log("========================================");
});