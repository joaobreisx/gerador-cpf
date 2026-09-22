import { REGIOES, formatarCpf, gerarCpfUnico, limpar, validarCpf } from '/lib/cpf.js';
import { ErroHistorico, criarHistorico } from '/lib/historico.js';
import { criarLimitador } from '/lib/limite.js';

// ---------- Estado ----------
const storage = (() => {
  try {
    const teste = '__teste__';
    window.localStorage.setItem(teste, teste);
    window.localStorage.removeItem(teste);
    return window.localStorage;
  } catch {
    return undefined; // navegação privada restrita: o histórico fica só na memória
  }
})();

const historico = criarHistorico(storage);
const limitador = criarLimitador(); // 5 por sessão; F5 zera
let cpfAtual = null;

// ---------- Elementos ----------
const $ = (id) => document.getElementById(id);
const el = {
  html: document.documentElement,
  topo: document.querySelector('.topo'),
  tema: $('alternar-tema'),
  visor: $('visor'),
  visorNumero: $('visor-numero'),
  visorTexto: $('visor-texto'),
  regiao: $('regiao'),
  pontuacao: $('pontuacao'),
  gerar: $('gerar'),
  gerarTexto: $('gerar-texto'),
  copiar: $('copiar'),
  copiarTexto: $('copiar-texto'),
  sessao: $('sessao'),
  sessaoBarra: $('sessao-barra'),
  sessaoTexto: $('sessao-texto'),
  recarregar: $('recarregar'),
  formManual: $('form-manual'),
  manualCpf: $('manual-cpf'),
  manualNota: $('manual-nota'),
  manualDica: $('manual-dica'),
  lista: $('lista'),
  vazio: $('vazio'),
  semResultado: $('sem-resultado'),
  contador: $('contador'),
  busca: $('busca'),
  exportar: $('exportar'),
  limpar: $('limpar'),
  avisos: $('avisos'),
  modeloItem: $('modelo-item'),
  mini: $('mini'),
  miniCpf: $('mini-cpf'),
  miniCopiar: $('mini-copiar'),
  miniGerar: $('mini-gerar'),
};

const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');

// ---------- Tema ----------
const CHAVE_TEMA = 'gerador-cpf:tema';

function lerTema() {
  try {
    return window.localStorage.getItem(CHAVE_TEMA);
  } catch {
    return null;
  }
}

function aplicarTema(tema) {
  el.html.dataset.theme = tema;
  try {
    window.localStorage.setItem(CHAVE_TEMA, tema);
  } catch {
    /* sem persistência, tudo bem */
  }
}

aplicarTema(lerTema() || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
el.tema.addEventListener('click', () => aplicarTema(el.html.dataset.theme === 'dark' ? 'light' : 'dark'));

// ---------- Visor com dígitos que rolam ----------
const slots = [];

function montarVisor() {
  const molde = '000.000.000-00';
  let indiceDigito = 0;
  for (const caractere of molde) {
    if (caractere === '.' || caractere === '-') {
      const sep = document.createElement('span');
      sep.className = 'separador';
      sep.textContent = caractere;
      el.visorNumero.append(sep);
      continue;
    }
    const slot = document.createElement('span');
    slot.className = indiceDigito >= 9 ? 'slot slot-verificador' : 'slot';
    const coluna = document.createElement('span');
    coluna.className = 'slot-coluna';
    // duas voltas de 0 a 9: permite sempre girar "para frente"
    for (let volta = 0; volta < 2; volta += 1) {
      for (let d = 0; d < 10; d += 1) {
        const s = document.createElement('span');
        s.textContent = d;
        coluna.append(s);
      }
    }
    coluna.dataset.pos = '0';
    slot.append(coluna);
    el.visorNumero.append(slot);
    slots.push(coluna);
    indiceDigito += 1;
  }
}

function mostrarNoVisor(cpf) {
  el.visor.dataset.vazio = 'false';
  [...cpf].forEach((caractere, i) => {
    const coluna = slots[i];
    const digito = Number(caractere);
    const atual = Number(coluna.dataset.pos) % 10;

    if (reduzirMovimento.matches) {
      coluna.style.transition = 'none';
      coluna.style.transform = `translateY(${-digito}em)`;
      coluna.dataset.pos = String(digito);
      return;
    }

    // volta para a primeira "volta" sem animação e gira até a segunda
    coluna.style.transition = 'none';
    coluna.style.transform = `translateY(${-atual}em)`;
    void coluna.offsetHeight; // força o navegador a aplicar a posição inicial
    const atraso = i * 45;
    coluna.style.transition = `transform 760ms cubic-bezier(.2,.8,.2,1) ${atraso}ms`;
    coluna.style.transform = `translateY(${-(digito + 10)}em)`;
    coluna.dataset.pos = String(digito + 10);
  });
  el.visorTexto.textContent = `CPF gerado: ${formatarCpf(cpf)}`;
  el.miniCpf.textContent = formatarCpf(cpf);
  el.miniCpf.dataset.vazio = 'false';
  el.miniCopiar.disabled = false;
}

// ---------- Utilidades ----------
function textoParaCopiar(cpf) {
  return el.pontuacao.checked ? formatarCpf(cpf) : limpar(cpf);
}

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

function avisar(mensagem, tipo = 'info') {
  const aviso = document.createElement('div');
  aviso.className = 'aviso';
  aviso.dataset.tipo = tipo;
  aviso.textContent = mensagem;
  el.avisos.append(aviso);
  setTimeout(() => {
    aviso.dataset.saindo = 'true';
    aviso.addEventListener('animationend', () => aviso.remove(), { once: true });
  }, 2600);
}

/** Efeito de onda a partir do ponto clicado. */
function onda(evento) {
  const botao = evento.currentTarget;
  const caixa = botao.getBoundingClientRect();
  const tamanho = Math.max(caixa.width, caixa.height);
  const circulo = document.createElement('span');
  circulo.className = 'onda';
  circulo.style.width = `${tamanho}px`;
  circulo.style.height = `${tamanho}px`;
  const x = (evento.clientX || caixa.left + caixa.width / 2) - caixa.left - tamanho / 2;
  const y = (evento.clientY || caixa.top + caixa.height / 2) - caixa.top - tamanho / 2;
  circulo.style.left = `${x}px`;
  circulo.style.top = `${y}px`;
  botao.append(circulo);
  circulo.addEventListener('animationend', () => circulo.remove(), { once: true });
}

document.querySelectorAll('.botao').forEach((b) => b.addEventListener('pointerdown', onda));

function reiniciarAnimacao(elemento, atributo) {
  delete elemento.dataset[atributo];
  void elemento.offsetWidth;
  elemento.dataset[atributo] = 'true';
}

function horaCurta(timestamp) {
  const data = new Date(timestamp);
  const hoje = new Date();
  const mesmoDia = data.toDateString() === hoje.toDateString();
  return mesmoDia
    ? data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// ---------- Sessão (limite de 5 sem login) ----------
function montarBarraSessao() {
  for (let i = 0; i < limitador.limite; i += 1) el.sessaoBarra.append(document.createElement('span'));
}

function atualizarSessao() {
  [...el.sessaoBarra.children].forEach((barra, i) => {
    barra.dataset.usado = String(i < limitador.usados());
  });

  const restantes = limitador.restantes();
  el.sessao.dataset.esgotado = String(limitador.esgotado());
  el.gerar.disabled = limitador.esgotado();
  el.miniGerar.disabled = limitador.esgotado();
  el.recarregar.hidden = !limitador.esgotado();

  if (limitador.esgotado()) {
    el.sessaoTexto.textContent = `Você usou as ${limitador.limite} gerações desta sessão. Recarregue a página para gerar mais.`;
    el.gerarTexto.textContent = 'Limite da sessão atingido';
  } else {
    el.sessaoTexto.textContent =
      restantes === 1 ? 'Resta 1 geração nesta sessão.' : `Restam ${restantes} gerações nesta sessão.`;
    el.gerarTexto.textContent = cpfAtual ? 'Gerar novo CPF' : 'Gerar CPF';
  }
}

// ---------- Histórico ----------
function criarLinha(item, novo = false) {
  const li = el.modeloItem.content.firstElementChild.cloneNode(true);
  li.dataset.id = item.id;
  if (novo && !reduzirMovimento.matches) li.dataset.novo = 'true';

  li.querySelector('.item-cpf').textContent = formatarCpf(item.cpf);
  li.querySelector('.item-nota').textContent = item.nota;

  const origem = li.querySelector('.etiqueta-origem');
  origem.dataset.origem = item.origem;
  origem.textContent = item.origem === 'manual' ? 'Manual' : 'Gerado';

  const validade = li.querySelector('.etiqueta-validade');
  validade.dataset.valido = String(item.valido);
  validade.textContent = item.valido ? 'Válido' : 'Inválido';

  li.querySelector('.item-regiao').textContent = item.regiao ? item.regiao : '';

  const hora = li.querySelector('.item-hora');
  hora.dateTime = new Date(item.criadoEm).toISOString();
  hora.textContent = horaCurta(item.criadoEm);

  const cpfLegivel = formatarCpf(item.cpf);
  li.querySelector('.item-copiar').setAttribute('aria-label', `Copiar ${cpfLegivel}`);
  li.querySelector('.item-remover').setAttribute('aria-label', `Remover ${cpfLegivel} do histórico`);
  return li;
}

function correspondeBusca(item, termo) {
  if (!termo) return true;
  const digitos = limpar(termo);
  const texto = termo.toLowerCase();
  return (digitos && item.cpf.includes(digitos)) || item.nota.toLowerCase().includes(texto);
}

function renderizarLista(idNovo) {
  const termo = el.busca.value.trim();
  const itens = historico.listar();
  const visiveis = itens.filter((i) => correspondeBusca(i, termo));

  el.lista.replaceChildren(...visiveis.map((i) => criarLinha(i, i.id === idNovo)));
  el.vazio.hidden = itens.length > 0;
  el.semResultado.hidden = !(itens.length > 0 && visiveis.length === 0);
  el.exportar.disabled = itens.length === 0;
  el.limpar.disabled = itens.length === 0;

  const total = String(itens.length);
  if (el.contador.textContent !== total) {
    el.contador.textContent = total;
    reiniciarAnimacao(el.contador, 'mudou');
  }
}

el.lista.addEventListener('click', async (evento) => {
  const botao = evento.target.closest('button');
  if (!botao) return;
  const li = botao.closest('.item');
  const item = historico.listar().find((i) => i.id === li.dataset.id);
  if (!item) return;

  if (botao.classList.contains('item-copiar')) {
    if (await copiarTexto(textoParaCopiar(item.cpf))) {
      botao.dataset.ok = 'true';
      setTimeout(() => delete botao.dataset.ok, 1400);
      avisar(`${formatarCpf(item.cpf)} copiado.`);
    }
  }

  if (botao.classList.contains('item-remover')) {
    const concluir = () => {
      historico.remover(item.id);
      renderizarLista();
    };
    if (reduzirMovimento.matches) return concluir();
    li.dataset.saindo = 'true';
    li.addEventListener('animationend', concluir, { once: true });
  }
});

el.busca.addEventListener('input', () => renderizarLista());

// ---------- Gerar ----------
function gerar() {
  if (!limitador.consumir()) {
    atualizarSessao();
    return;
  }
  try {
    const cpf = gerarCpfUnico(historico.cpfs(), { regiao: el.regiao.value });
    const item = historico.adicionar({ cpf, origem: 'gerado' });
    cpfAtual = cpf;
    mostrarNoVisor(cpf);
    el.copiar.disabled = false;
    renderizarLista(item.id);
  } catch (erro) {
    avisar(erro.message, 'erro');
  }
  atualizarSessao();
}

el.gerar.addEventListener('click', gerar);

document.addEventListener('keydown', (evento) => {
  const digitando = evento.target.closest('input, select, textarea, [contenteditable]');
  if (digitando || evento.ctrlKey || evento.metaKey || evento.altKey) return;
  if (evento.key === 'g' || evento.key === 'G') {
    evento.preventDefault();
    if (!el.gerar.disabled) el.gerar.click();
  }
});

el.miniGerar.addEventListener('click', gerar);
el.miniCopiar.addEventListener('click', () => el.copiar.click());

el.copiar.addEventListener('click', async () => {
  if (!cpfAtual) return;
  if (await copiarTexto(textoParaCopiar(cpfAtual))) {
    el.copiar.dataset.ok = 'true';
    el.copiarTexto.textContent = 'Copiado';
    reiniciarAnimacao(el.visor, 'copiado');
    setTimeout(() => {
      delete el.copiar.dataset.ok;
      el.copiarTexto.textContent = 'Copiar';
    }, 1500);
  } else {
    avisar('Não foi possível copiar. Selecione o número e use Ctrl+C.', 'erro');
  }
});

el.recarregar.addEventListener('click', () => window.location.reload());

// ---------- Adicionar manualmente ----------
function mascarar(valor) {
  const d = limpar(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

el.manualCpf.addEventListener('input', () => {
  el.manualCpf.value = mascarar(el.manualCpf.value);
  const digitos = limpar(el.manualCpf.value);
  if (digitos.length < 11) {
    el.manualDica.dataset.estado = '';
    el.manualDica.textContent = `Faltam ${11 - digitos.length} números.`;
  } else if (historico.contem(digitos)) {
    el.manualDica.dataset.estado = 'invalido';
    el.manualDica.textContent = 'Este CPF já está no histórico.';
  } else if (validarCpf(digitos)) {
    el.manualDica.dataset.estado = 'valido';
    el.manualDica.textContent = 'CPF válido.';
  } else {
    el.manualDica.dataset.estado = 'invalido';
    el.manualDica.textContent = 'Dígitos verificadores não conferem. Você ainda pode anotar.';
  }
});

el.formManual.addEventListener('submit', (evento) => {
  evento.preventDefault();
  try {
    const item = historico.adicionar({
      cpf: el.manualCpf.value,
      nota: el.manualNota.value,
      origem: 'manual',
    });
    el.formManual.reset();
    el.manualDica.dataset.estado = '';
    el.manualDica.textContent = 'Salvo. Pode anotar outro.';
    renderizarLista(item.id);
    avisar(`${formatarCpf(item.cpf)} salvo no histórico.`);
    el.manualCpf.focus();
  } catch (erro) {
    if (erro instanceof ErroHistorico) {
      el.manualDica.dataset.estado = 'invalido';
      el.manualDica.textContent = erro.message;
      el.manualCpf.focus();
    } else {
      avisar('Não foi possível salvar. Tente de novo.', 'erro');
    }
  }
});

// ---------- Exportar e limpar ----------
el.exportar.addEventListener('click', () => {
  const texto = historico.exportarTexto({ formatado: el.pontuacao.checked });
  const blob = new Blob([`${texto}\n`], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cpfs-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

let timerLimpar;
el.limpar.addEventListener('click', () => {
  if (el.limpar.dataset.confirmar === 'true') {
    clearTimeout(timerLimpar);
    delete el.limpar.dataset.confirmar;
    el.limpar.textContent = 'Limpar histórico';
    historico.limpar();
    renderizarLista();
    avisar('Histórico apagado.');
    return;
  }
  el.limpar.dataset.confirmar = 'true';
  el.limpar.textContent = 'Clique de novo para apagar';
  timerLimpar = setTimeout(() => {
    delete el.limpar.dataset.confirmar;
    el.limpar.textContent = 'Limpar histórico';
  }, 3000);
});

// ---------- Rolagem ----------
window.addEventListener(
  'scroll',
  () => {
    el.topo.dataset.rolado = String(window.scrollY > 4);
  },
  { passive: true },
);

// No celular, quando os botões do gerador saem da tela, a barra flutuante aparece.
if ('IntersectionObserver' in window) {
  const observador = new IntersectionObserver(([entrada]) => {
    const visivel = !entrada.isIntersecting && entrada.boundingClientRect.top < 0;
    el.mini.dataset.visivel = String(visivel);
    el.mini.setAttribute('aria-hidden', String(!visivel));
    el.miniGerar.tabIndex = visivel ? 0 : -1;
    el.miniCopiar.tabIndex = visivel ? 0 : -1;
    document.body.dataset.mini = String(visivel && window.innerWidth < 960);
  });
  observador.observe(el.gerar);
}

// ---------- Início ----------
for (const [digito, ufs] of Object.entries(REGIOES)) {
  const opcao = document.createElement('option');
  opcao.value = digito;
  opcao.textContent = ufs;
  el.regiao.append(opcao);
}

el.miniCpf.dataset.vazio = 'true';
montarVisor();
montarBarraSessao();
atualizarSessao();
renderizarLista();
