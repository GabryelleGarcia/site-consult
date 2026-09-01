const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;


// ==========================================
// CONFIGURAÇÕES
// ==========================================

app.use(cors());

app.use(express.json());


// ==========================================
// CONFIGURAÇÃO DO E-MAIL
// ==========================================

const transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});


// ==========================================
// TESTE DO SERVIDOR
// ==========================================

app.get("/", (req, res) => {

    res.json({
        sucesso: true,
        mensagem: "Backend da Consult Saúde funcionando!"
    });

});


// ==========================================
// RECEBER LEAD
// ==========================================

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


        // ======================================
        // VALIDAÇÃO DOS CAMPOS OBRIGATÓRIOS
        // ======================================

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

                mensagem:
                    "Preencha todos os campos obrigatórios."

            });

        }


        // ======================================
        // DATA E HORA DO LEAD
        // ======================================

        const dataHora = new Date().toLocaleString(
            "pt-BR",
            {
                timeZone: "America/Sao_Paulo"
            }
        );


        // ======================================
        // ASSUNTO DO E-MAIL
        // ======================================

        const assunto =
            `NOVO LEAD - ${nome} - Consult Saúde`;


        // ======================================
        // E-MAIL DO LEAD
        // ======================================

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


        // ======================================
        // ENVIO DO E-MAIL
        // ======================================

        await transporter.sendMail({

            from:
                `"Site Consult Saúde" <${process.env.EMAIL_USER}>`,

            to:
                process.env.EMAIL_DESTINO,

            replyTo:
                email,

            subject:
                assunto,

            text:
                mensagem

        });


        // ======================================
        // RESPOSTA PARA O JAVASCRIPT
        // ======================================

        return res.status(200).json({

            sucesso: true,

            mensagem:
                "Lead enviado com sucesso!"

        });


    } catch (erro) {

        console.error(
            "Erro ao enviar lead:",
            erro
        );


        return res.status(500).json({

            sucesso: false,

            mensagem:
                "Erro interno ao processar o lead."

        });

    }

});


// ==========================================
// INICIA O SERVIDOR
// ==========================================

app.listen(PORT, () => {

    console.log(
        `Servidor Consult Saúde iniciado na porta ${PORT}`
    );

});