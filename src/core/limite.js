/**
 * Limite de gerações por sessão (sem login).
 * O contador vive só na memória: recarregar a página (F5) começa uma sessão nova.
 */
export const LIMITE_PADRAO = 5;

export function criarLimitador(limite = LIMITE_PADRAO) {
  if (!Number.isInteger(limite) || limite < 1) {
    throw new RangeError('O limite deve ser um inteiro maior que zero.');
  }
  let usados = 0;

  return {
    limite,
    usados: () => usados,
    restantes: () => limite - usados,
    esgotado: () => usados >= limite,
    consumir() {
      if (usados >= limite) return false;
      usados += 1;
      return true;
    },
  };
}
