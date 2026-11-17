const nodemailer = require("nodemailer");

const { rateLimit } = require("express-rate-limit");

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function lerTexto(valor, limite) {
    if (typeof valor !== "string") {
        return "";
    }

    return valor.trim().slice(0, limite);
}

function escaparHtml(valor) {
    return String(valor).replace(/[&<>"']/g, (caractere) => {
        const caracteres = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return caracteres[caractere];
    });
}

function responderPagina(res, status, titulo, mensagem) {
    return res.status(status).type("html").send(`
        <!DOCTYPE html>

        <html lang="pt-BR">

        <head>
            <meta charset="UTF-8">

            <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
            >

            <title>${escaparHtml(titulo)} | JWC</title>

            <style>
                * {
                    box-sizing: border-box;
                }

                body {
                    display: grid;
                    place-items: center;

                    min-height: 100vh;
                    margin: 0;
                    padding: 24px;

                    background: #fcfaf8;
                    color: #292323;

                    font-family: Arial, Helvetica, sans-serif;
                    line-height: 1.7;
                }

                main {
                    width: 100%;
                    max-width: 520px;
                    padding: 36px;

                    border: 1px solid #e8dfdc;
                    border-top: 4px solid #a5090d;
                    border-radius: 12px;

                    background: #ffffff;
                    text-align: center;
                }

                h1 {
                    color: #a5090d;

                    font-family: Georgia, serif;
                    font-size: 2rem;
                    font-weight: 400;
                    line-height: 1.2;
                }
            </style>
        </head>

        <body>
            <main>
                <p>José Walter Carvalho</p>

                <h1>${escaparHtml(titulo)}</h1>

                <p>${escaparHtml(mensagem)}</p>
            </main>
        </body>

        </html>
    `);
}

// ==========================================
// REGISTRO DA ROTA
// ==========================================

module.exports = function registrarRotasJwc(app) {
    let transportador;

    const limitarEnvios = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 5,
        standardHeaders: "draft-7",
        legacyHeaders: false,

        handler: (req, res) => {
            return responderPagina(
                res,
                429,
                "Aguarde alguns minutos",
                "Foram realizadas várias solicitações. Tente novamente mais tarde."
            );
        }
    });

    app.post(
        "/enviar-lead-jwc",
        limitarEnvios,

        async (req, res) => {
            // ==========================================
            // LEITURA DOS CAMPOS
            // ==========================================

            const dados = req.body || {};

            const nome = lerTexto(dados.nome, 120);

            const telefone = lerTexto(dados.telefone, 20);

            const email = lerTexto(dados.email, 160);

            const idades = lerTexto(dados.idades, 200);

            const possuiCnpj = lerTexto(dados.possuiCnpj, 10);

            const possuiPlano = lerTexto(dados.possuiPlano, 10);

            const operadoraAtual =
                possuiPlano === "Sim"
                    ? lerTexto(dados.operadoraAtual, 120)
                    : "";

            const preferencias = lerTexto(dados.preferencias, 300);

            // ==========================================
            // VALIDAÇÃO
            // ==========================================

            const telefoneNumeros = telefone.replace(/\D/g, "");

            const emailValido =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

            const respostasValidas = ["Sim", "Não"];

            if (
                nome.length < 3 ||
                !/^\d{10,13}$/.test(telefoneNumeros) ||
                !emailValido ||
                !idades ||
                !respostasValidas.includes(possuiCnpj) ||
                !respostasValidas.includes(possuiPlano)
            ) {
                return responderPagina(
                    res,
                    400,
                    "Confira seus dados",
                    "Volte ao formulário e revise os campos obrigatórios, o telefone e o e-mail."
                );
            }

            // ==========================================
            // CONFIGURAÇÕES DO E-MAIL
            // ==========================================

            const {
                JWC_SMTP_HOST,
                JWC_SMTP_PORT,
                JWC_SMTP_USER,
                JWC_SMTP_PASS,
                JWC_EMAIL_FROM,
                JWC_EMAIL_TO
            } = process.env;

            const portaSmtp = Number(JWC_SMTP_PORT);

            if (
                !JWC_SMTP_HOST ||
                !JWC_SMTP_PORT ||
                !JWC_SMTP_USER ||
                !JWC_SMTP_PASS ||
                !JWC_EMAIL_FROM ||
                !JWC_EMAIL_TO ||
                !Number.isInteger(portaSmtp) ||
                portaSmtp < 1 ||
                portaSmtp > 65535
            ) {
                return responderPagina(
                    res,
                    503,
                    "Envio temporariamente indisponível",
                    "O formulário ainda não está disponível para envio. Entre em contato pelo telefone informado no site."
                );
            }

            // ==========================================
            // CONTEÚDO DO LEAD
            // ==========================================

            const campos = [
                ["Nome", nome],
                ["WhatsApp", telefone],
                ["E-mail", email],
                ["Idades", idades],
                ["Possui CNPJ?", possuiCnpj],
                ["Possui plano atualmente?", possuiPlano],
                ["Operadora atual", operadoraAtual || "Não informada"],
                [
                    "Hospital ou laboratório de preferência",
                    preferencias || "Não informado"
                ],
                ["Origem", "Site José Walter Carvalho"]
            ];

            const textoEmail = campos
                .map(([rotulo, valor]) => `${rotulo}: ${valor}`)
                .join("\n");

            const linhasHtml = campos
                .map(([rotulo, valor]) => `
                    <tr>
                        <th
                            align="left"
                            style="padding: 12px; border-bottom: 1px solid #e8dfdc;"
                        >
                            ${escaparHtml(rotulo)}
                        </th>

                        <td
                            style="padding: 12px; border-bottom: 1px solid #e8dfdc;"
                        >
                            ${escaparHtml(valor)}
                        </td>
                    </tr>
                `)
                .join("");

            // ==========================================
            // ENVIO
            // ==========================================

            try {
                if (!transportador) {
                    transportador = nodemailer.createTransport({
                        host: JWC_SMTP_HOST,
                        port: portaSmtp,
                        secure: portaSmtp === 465,
                        requireTLS: portaSmtp !== 465,

                        auth: {
                            user: JWC_SMTP_USER,
                            pass: JWC_SMTP_PASS
                        },

                        connectionTimeout: 15000,
                        greetingTimeout: 15000,
                        socketTimeout: 30000
                    });
                }

                const resultado = await transportador.sendMail({
                    from: {
                        name: "Site José Walter Carvalho",
                        address: JWC_EMAIL_FROM
                    },

                    to: JWC_EMAIL_TO,

                    replyTo: email,

                    subject: "Nova solicitação de cotação — JWC",

                    text: textoEmail,

                    html: `
                        <div
                            style="
                                max-width: 680px;
                                margin: auto;
                                color: #292323;
                                font-family: Arial, sans-serif;
                                line-height: 1.6;
                            "
                        >
                            <h1 style="color: #a5090d;">
                                Nova solicitação de cotação
                            </h1>

                            <p>
                                Um visitante preencheu o formulário
                                do site José Walter Carvalho.
                            </p>

                            <table
                                style="
                                    width: 100%;
                                    border-collapse: collapse;
                                "
                            >
                                ${linhasHtml}
                            </table>
                        </div>
                    `
                });

                if (
                    !resultado.accepted ||
                    resultado.accepted.length === 0
                ) {
                    throw new Error("Nenhum destinatário aceito.");
                }

                return responderPagina(
                    res,
                    200,
                    "Solicitação recebida!",
                    "Obrigado pelo contato. Em breve entraremos em contato para orientar você sobre sua cotação."
                );
            } catch (erro) {
                // Não registra dados pessoais nem credenciais.
                console.error(
                    "Falha no envio do lead JWC:",
                    erro.code || "ERRO_ENVIO"
                );

                return responderPagina(
                    res,
                    502,
                    "Não foi possível enviar",
                    "Tente novamente mais tarde ou entre em contato pelo telefone informado no site."
                );
            }
        }
    );
};