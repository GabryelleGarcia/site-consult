// Integração com o backend e com a conversão do Google Ads.
const API_URL = "https://consult-saude-backend.onrender.com/api/leads";

const formulario = document.querySelector("#formulario-cotacao");

function registrarConversaoGoogleAds() {
  if (typeof gtag !== "function") {
    return;
  }

  gtag("event", "conversion", {
    send_to: "AW-18422949406/k7QeCM7L24EdEJ7M39BE",
    value: 1.0,
    currency: "BRL"
  });
}

if (formulario) {
  const mensagem = formulario.querySelector(".form-mensagem");
  const botao = formulario.querySelector('button[type="submit"]');
  const telefone = formulario.querySelector('input[name="telefone"]');
  const radiosPlano = formulario.querySelectorAll(
    'input[name="possuiPlano"]'
  );
  const camposPlanoAtual = formulario.querySelector(
    "#campos-plano-atual"
  );
  const operadoraAtual = formulario.querySelector(
    'input[name="operadoraAtual"]'
  );

  function mostrarMensagem(texto, tipo = "") {
    mensagem.textContent = texto;

    mensagem.className = tipo
      ? `form-mensagem ${tipo}`
      : "form-mensagem";

    mensagem.setAttribute(
      "role",
      tipo === "erro" ? "alert" : "status"
    );
  }

  // Mostra a operadora somente para quem já possui plano.
  function atualizarCampoOperadora() {
    const possuiPlano =
      formulario.querySelector(
        'input[name="possuiPlano"]:checked'
      )?.value === "Sim";

    camposPlanoAtual.hidden = !possuiPlano;
    operadoraAtual.disabled = !possuiPlano;

    if (!possuiPlano) {
      operadoraAtual.value = "";
    }
  }

  radiosPlano.forEach((radio) => {
    radio.addEventListener("change", atualizarCampoOperadora);
  });

  atualizarCampoOperadora();

  // Formata o telefone enquanto a pessoa digita.
  telefone.addEventListener("input", () => {
    const digitos = telefone.value
      .replace(/\D/g, "")
      .slice(0, 11);

    if (digitos.length <= 2) {
      telefone.value = digitos ? `(${digitos}` : "";
    } else if (digitos.length <= 6) {
      telefone.value =
        `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
    } else {
      const corte = digitos.length > 10 ? 7 : 6;

      telefone.value =
        `(${digitos.slice(0, 2)}) ` +
        `${digitos.slice(2, corte)}-` +
        `${digitos.slice(corte)}`;
    }
  });

  formulario.addEventListener("submit", async (event) => {
    event.preventDefault();
    mostrarMensagem("");

    if (!formulario.checkValidity()) {
      formulario.reportValidity();
      return;
    }

    botao.disabled = true;

    const textoOriginal = botao.textContent;
    botao.textContent = "Enviando...";

    try {
      const dados = Object.fromEntries(
        new FormData(formulario).entries()
      );

      // Mantém o valor usado anteriormente pelo backend.
      dados.origem = "Formulário principal";

      const resposta = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(dados)
      });

      let resultado = {};

      try {
        resultado = await resposta.json();
      } catch {
        // Algumas respostas de erro não contêm JSON.
      }

      if (!resposta.ok) {
        throw new Error(
          resultado.mensagem ||
          "Falha no envio da cotação."
        );
      }

      mostrarMensagem(
        "✓ Solicitação enviada com sucesso! Nossa equipe entrará em contato em breve.",
        "sucesso"
      );

      // Só registra a conversão após o backend aceitar o lead.
      registrarConversaoGoogleAds();

      formulario.reset();
      atualizarCampoOperadora();
    } catch (erro) {
      console.error("Erro ao enviar lead:", erro);

      mostrarMensagem(
        "Não foi possível enviar sua solicitação. Verifique sua conexão e tente novamente.",
        "erro"
      );
    } finally {
      botao.disabled = false;
      botao.textContent = textoOriginal;
    }
  });
}