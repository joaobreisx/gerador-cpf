import { formatarCpf, limpar, regiaoDoCpf, validarCpf } from './cpf.js';

export const CHAVE_PADRAO = 'gerador-cpf:historico';

export class ErroHistorico extends Error {
  constructor(codigo, mensagem) {
    super(mensagem);
    this.name = 'ErroHistorico';
    this.codigo = codigo;
  }
}

function lerSeguro(storage, chave) {
  try {
    const bruto = storage?.getItem(chave);
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function gravarSeguro(storage, chave, itens) {
  try {
    storage?.setItem(chave, JSON.stringify(itens));
    return true;
  } catch {
    return false;
  }
}

/**
 * Prepara um campo para CSV: aspas quando há ; " ou quebra de linha (RFC 4180)
 * e um apóstrofo antes de = + - @ para o Excel não interpretar como fórmula.
 */
function campoCsv(valor) {
  let texto = String(valor);
  if (/^[=+\-@]/.test(texto)) texto = `'${texto}`;
  return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

let contadorId = 0;
function novoId(agora) {
  contadorId += 1;
  return `${agora.toString(36)}-${contadorId.toString(36)}`;
}

/**
 * Histórico de CPFs (gerados ou anotados à mão), sem repetição.
 * @param {Storage} storage algo com getItem/setItem (localStorage no navegador).
 */
export function criarHistorico(storage, { chave = CHAVE_PADRAO, relogio = () => Date.now() } = {}) {
  let itens = lerSeguro(storage, chave);

  const salvar = () => gravarSeguro(storage, chave, itens);

  return {
    listar: () => [...itens],
    tamanho: () => itens.length,
    cpfs: () => new Set(itens.map((i) => i.cpf)),
    contem: (cpf) => itens.some((i) => i.cpf === limpar(cpf)),

    /**
     * @param {{cpf: string, origem?: 'gerado'|'manual', nota?: string}} dados
     * @returns o item salvo (o mais recente fica no topo)
     */
    adicionar({ cpf, origem = 'gerado', nota = '' }) {
      const digitos = limpar(cpf);
      if (digitos.length !== 11) {
        throw new ErroHistorico('formato', 'O CPF precisa ter 11 dígitos.');
      }
      if (itens.some((i) => i.cpf === digitos)) {
        throw new ErroHistorico('duplicado', `O CPF ${formatarCpf(digitos)} já está no histórico.`);
      }
      const agora = relogio();
      const item = {
        id: novoId(agora),
        cpf: digitos,
        origem,
        nota: String(nota).trim().slice(0, 120),
        valido: validarCpf(digitos),
        regiao: regiaoDoCpf(digitos),
        criadoEm: agora,
      };
      itens = [item, ...itens];
      salvar();
      return item;
    },

    remover(id) {
      const antes = itens.length;
      itens = itens.filter((i) => i.id !== id);
      salvar();
      return itens.length < antes;
    },

    limpar() {
      itens = [];
      salvar();
    },

    /** Texto simples, um CPF por linha, pronto para colar ou baixar. */
    exportarTexto({ formatado = true } = {}) {
      return itens
        .map((i) => {
          const cpf = formatado ? formatarCpf(i.cpf) : i.cpf;
          return i.nota ? `${cpf}\t${i.nota}` : cpf;
        })
        .join('\n');
    },

    /** CSV com cabeçalho, separado por ponto e vírgula (padrão do Excel em português). */
    exportarCsv({ formatado = true } = {}) {
      const cabecalho = ['cpf', 'origem', 'valido', 'regiao', 'nota', 'criado_em'];
      const linhas = itens.map((i) => [
        formatado ? formatarCpf(i.cpf) : i.cpf,
        i.origem,
        i.valido ? 'sim' : 'nao',
        i.regiao,
        i.nota,
        new Date(i.criadoEm).toISOString(),
      ]);
      return [cabecalho, ...linhas].map((campos) => campos.map(campoCsv).join(';')).join('\r\n');
    },
  };
}
