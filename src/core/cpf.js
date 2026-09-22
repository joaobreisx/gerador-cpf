/**
 * Regras do CPF: geração, validação e formatação.
 * Módulo puro (sem dependências), usado pelo servidor e pelo navegador.
 */

/** O 9º dígito do CPF indica a região fiscal onde ele foi emitido. */
export const REGIOES = Object.freeze({
  0: 'RS',
  1: 'DF, GO, MS, MT e TO',
  2: 'AC, AM, AP, PA, RO e RR',
  3: 'CE, MA e PI',
  4: 'AL, PB, PE e RN',
  5: 'BA e SE',
  6: 'MG',
  7: 'ES e RJ',
  8: 'SP',
  9: 'PR e SC',
});

/** Sorteia um dígito de 0 a 9 usando o gerador criptográfico quando disponível. */
export function digitoAleatorio() {
  const cripto = globalThis.crypto;
  if (cripto && typeof cripto.getRandomValues === 'function') {
    const buffer = new Uint8Array(1);
    // Rejeita valores >= 250 para evitar viés no módulo 10.
    do {
      cripto.getRandomValues(buffer);
    } while (buffer[0] >= 250);
    return buffer[0] % 10;
  }
  return Math.floor(Math.random() * 10);
}

/** Remove tudo que não for dígito. */
export function limpar(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

/**
 * Calcula um dígito verificador pelo módulo 11.
 * Recebe os 9 primeiros dígitos (1º verificador) ou os 10 primeiros (2º verificador).
 */
export function calcularDigito(digitos) {
  const pesoInicial = digitos.length + 1;
  const soma = digitos.reduce((total, d, i) => total + d * (pesoInicial - i), 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** Recebe a base de 9 dígitos e devolve os dois verificadores. */
export function calcularDigitosVerificadores(base) {
  const numeros = [...limpar(base)].map(Number);
  if (numeros.length !== 9) {
    throw new RangeError('A base do CPF precisa ter 9 dígitos.');
  }
  const primeiro = calcularDigito(numeros);
  const segundo = calcularDigito([...numeros, primeiro]);
  return [primeiro, segundo];
}

function todosIguais(digitos) {
  return /^(\d)\1+$/.test(digitos);
}

/** Verifica formato e dígitos verificadores. Aceita com ou sem pontuação. */
export function validarCpf(valor) {
  const digitos = limpar(valor);
  if (digitos.length !== 11 || todosIguais(digitos)) return false;
  const [d1, d2] = calcularDigitosVerificadores(digitos.slice(0, 9));
  return d1 === Number(digitos[9]) && d2 === Number(digitos[10]);
}

/** Formata como 000.000.000-00. Valores incompletos são devolvidos só com dígitos. */
export function formatarCpf(valor) {
  const d = limpar(valor);
  if (d.length !== 11) return d;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Devolve as UFs da região fiscal do CPF, ou null se o valor não tiver 9 dígitos. */
export function regiaoDoCpf(valor) {
  const d = limpar(valor);
  if (d.length < 9) return null;
  return REGIOES[d[8]];
}

/**
 * Gera um CPF válido (11 dígitos, sem pontuação).
 * @param {object} [opcoes]
 * @param {number|string} [opcoes.regiao] 9º dígito (0 a 9) para fixar a região fiscal.
 * @param {() => number} [opcoes.aleatorio] função que devolve um dígito de 0 a 9 (útil em testes).
 */
export function gerarCpf({ regiao, aleatorio = digitoAleatorio } = {}) {
  const temRegiao = regiao !== undefined && regiao !== null && regiao !== '';
  if (temRegiao && !/^\d$/.test(String(regiao))) {
    throw new RangeError('A região deve ser um dígito de 0 a 9.');
  }

  let base;
  do {
    const oito = Array.from({ length: 8 }, () => aleatorio()).join('');
    const nono = temRegiao ? String(regiao) : String(aleatorio());
    base = oito + nono;
  } while (todosIguais(base));

  return base + calcularDigitosVerificadores(base).join('');
}

/**
 * Gera um CPF que ainda não existe no conjunto informado.
 * @param {Iterable<string>} existentes CPFs já usados (com ou sem pontuação).
 */
export function gerarCpfUnico(existentes = [], opcoes = {}, maxTentativas = 1000) {
  const usados = new Set([...existentes].map(limpar));
  for (let i = 0; i < maxTentativas; i += 1) {
    const cpf = gerarCpf(opcoes);
    if (!usados.has(cpf)) return cpf;
  }
  throw new Error('Não foi possível gerar um CPF inédito.');
}
