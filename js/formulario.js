// ==========================================
// CONSULT SAÚDE
// FORMULÁRIO DE COTAÇÃO / CAPTURA DE LEADS
// ==========================================


// ==========================================
// CONFIGURAÇÃO DA API
// ==========================================

// Durante o desenvolvimento local:
const API_URL = "http://localhost:3000/api/leads";

// Quando o backend estiver publicado,
// substituiremos a URL acima pelo endereço real.



// ==========================================
// SELECIONA OS FORMULÁRIOS
// ==========================================

const formularios = document.querySelectorAll(
    "#formulario-cotacao, #formulario-cotacao-2"
);



// ==========================================
// FUNÇÃO PARA MOSTRAR MENSAGEM
// ==========================================

function mostrarMensagem(formulario, mensagem, tipo) {

    const elementoMensagem =
        formulario.querySelector(".form-mensagem");

    if (!elementoMensagem) {
        return;
    }

    elementoMensagem.textContent = mensagem;

    elementoMensagem.className =
        `form-mensagem ${tipo}`;

}



// ==========================================
// FUNÇÃO PARA LIMPAR MENSAGEM
// ==========================================

function limparMensagem(formulario) {

    const elementoMensagem =
        formulario.querySelector(".form-mensagem");

    if (!elementoMensagem) {
        return;
    }

    elementoMensagem.textContent = "";

    elementoMensagem.className =
        "form-mensagem";

}



// ==========================================
// FUNÇÃO PARA ALTERAR ESTADO DO BOTÃO
// ==========================================

function alterarBotao(botao, carregando) {

    if (carregando) {

        botao.disabled = true;

        botao.dataset.textoOriginal =
            botao.textContent;

        botao.textContent =
            "Enviando...";

    } else {

        botao.disabled = false;

        botao.textContent =
            botao.dataset.textoOriginal ||
            "Solicitar Cotação";

    }

}



// ==========================================
// ENVIO DOS FORMULÁRIOS
// ==========================================

formularios.forEach((formulario) => {

    formulario.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            limparMensagem(formulario);


            // --------------------------------------
            // BOTÃO DE ENVIO
            // --------------------------------------

            const botao =
                formulario.querySelector(
                    'button[type="submit"]'
                );


            if (!botao) {
                return;
            }


            // --------------------------------------
            // VALIDAÇÃO NATIVA DO HTML
            // --------------------------------------

            if (!formulario.checkValidity()) {

                formulario.reportValidity();

                return;

            }


            // --------------------------------------
            // ATIVA ESTADO DE ENVIO
            // --------------------------------------

            alterarBotao(botao, true);


            try {

                // ----------------------------------
                // CAPTURA OS DADOS
                // ----------------------------------

                const dadosFormulario =
                    new FormData(formulario);


                // ----------------------------------
                // CONVERTE PARA OBJETO
                // ----------------------------------

                const dados =
                    Object.fromEntries(
                        dadosFormulario.entries()
                    );


                // ----------------------------------
                // IDENTIFICA QUAL FORMULÁRIO
                // GEROU O LEAD
                // ----------------------------------

                dados.origem =
                    formulario.id === "formulario-cotacao"
                        ? "Formulário principal"
                        : "Formulário secundário";


                // ----------------------------------
                // ENVIA PARA O BACKEND
                // ----------------------------------

                const resposta =
                    await fetch(API_URL, {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify(dados)

                    });


                // ----------------------------------
                // TENTA LER A RESPOSTA
                // ----------------------------------

                let resultado;

                try {

                    resultado =
                        await resposta.json();

                } catch {

                    resultado = {};

                }


                // ----------------------------------
                // VERIFICA SE DEU ERRO
                // ----------------------------------

                if (!resposta.ok) {

                    throw new Error(
                        resultado.mensagem ||
                        "Não foi possível enviar sua solicitação."
                    );

                }


                // ----------------------------------
                // SUCESSO
                // ----------------------------------

                mostrarMensagem(
                    formulario,
                    "✓ Solicitação enviada com sucesso! Nossa equipe entrará em contato em breve.",
                    "sucesso"
                );


                // ----------------------------------
                // LIMPA O FORMULÁRIO
                // ----------------------------------

                formulario.reset();


                // ----------------------------------
                // VOLTA O FOCO PARA O PRIMEIRO CAMPO
                // ----------------------------------

                const primeiroCampo =
                    formulario.querySelector(
                        "input"
                    );

                if (primeiroCampo) {
                    primeiroCampo.focus();
                }


            } catch (erro) {

                // ----------------------------------
                // ERRO
                // ----------------------------------

                console.error(
                    "Erro ao enviar lead:",
                    erro
                );


                mostrarMensagem(
                    formulario,
                    "Não foi possível enviar sua solicitação. Verifique sua conexão e tente novamente.",
                    "erro"
                );


            } finally {

                // ----------------------------------
                // REATIVA O BOTÃO
                // ----------------------------------

                alterarBotao(botao, false);

            }

        }
    );

});



// ==========================================
// MÁSCARA DE TELEFONE
// ==========================================

const telefones =
    document.querySelectorAll(
        'input[name="telefone"]'
    );


telefones.forEach((campo) => {

    campo.addEventListener(
        "input",
        function () {

            let valor =
                campo.value.replace(/\D/g, "");


            // Limita a 11 números
            valor =
                valor.substring(0, 11);


            if (valor.length <= 10) {

                valor =
                    valor.replace(
                        /^(\d{2})(\d{4})(\d{0,4}).*/,
                        "($1) $2-$3"
                    );

            } else {

                valor =
                    valor.replace(
                        /^(\d{2})(\d{5})(\d{0,4}).*/,
                        "($1) $2-$3"
                    );

            }


            campo.value = valor;

        }
    );

});



// ==========================================
// BOTÃO "SOLICITAR COTAÇÃO" DO TOPO
// ==========================================

const botaoTopo =
    document.querySelector(
        ".cotação-button-logo"
    );


if (botaoTopo) {

    botaoTopo.addEventListener(
        "click",
        function () {

            const formulario =
                document.querySelector(
                    "#formulario-cotacao"
                );


            if (formulario) {

                formulario.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });


                const primeiroCampo =
                    formulario.querySelector(
                        "input"
                    );


                if (primeiroCampo) {

                    setTimeout(() => {

                        primeiroCampo.focus();

                    }, 600);

                }

            }

        }
    );

}

