import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LIMITE_PADRAO, criarLimitador } from '../../src/core/limite.js';

describe('criarLimitador', () => {
  it('permite 5 gerações por sessão por padrão', () => {
    const limitador = criarLimitador();
    assert.equal(LIMITE_PADRAO, 5);
    for (let i = 0; i < 5; i += 1) assert.equal(limitador.consumir(), true);
    assert.equal(limitador.consumir(), false);
    assert.equal(limitador.esgotado(), true);
    assert.equal(limitador.restantes(), 0);
  });

  it('conta usados e restantes', () => {
    const limitador = criarLimitador(3);
    limitador.consumir();
    assert.equal(limitador.usados(), 1);
    assert.equal(limitador.restantes(), 2);
    assert.equal(limitador.esgotado(), false);
  });

  it('uma sessão nova (F5) começa do zero', () => {
    const primeira = criarLimitador();
    while (primeira.consumir());
    const segunda = criarLimitador();
    assert.equal(segunda.restantes(), 5);
  });

  it('rejeita limites inválidos', () => {
    assert.throws(() => criarLimitador(0), RangeError);
    assert.throws(() => criarLimitador(2.5), RangeError);
  });
});
