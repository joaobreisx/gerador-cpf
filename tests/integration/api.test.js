import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { criarApp } from '../../src/app.js';
import { validarCpf } from '../../src/core/cpf.js';

let servidor;
let base;

before(async () => {
  servidor = criarApp({ commit: 'abc123' }).listen(0);
  await new Promise((resolve) => servidor.once('listening', resolve));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => new Promise((resolve) => servidor.close(resolve)));

const get = (rota) => fetch(base + rota);

describe('API', () => {
  it('GET /health informa status e commit', async () => {
    const res = await get('/health');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ok', commit: 'abc123' });
  });

  it('GET /api/cpf/gerar devolve 1 CPF formatado por padrão', async () => {
    const { cpfs } = await (await get('/api/cpf/gerar')).json();
    assert.equal(cpfs.length, 1);
    assert.match(cpfs[0], /^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
    assert.equal(validarCpf(cpfs[0]), true);
  });

  it('gera até 5 CPFs distintos, sem pontuação e na região pedida', async () => {
    const { cpfs } = await (await get('/api/cpf/gerar?quantidade=5&formatado=false&regiao=9')).json();
    assert.equal(cpfs.length, 5);
    assert.equal(new Set(cpfs).size, 5);
    for (const cpf of cpfs) {
      assert.match(cpf, /^\d{11}$/);
      assert.equal(cpf[8], '9');
      assert.equal(validarCpf(cpf), true);
    }
  });

  it('recusa quantidade acima do limite ou inválida', async () => {
    for (const q of ['6', '0', 'abc']) {
      const res = await get(`/api/cpf/gerar?quantidade=${q}`);
      assert.equal(res.status, 400);
    }
  });

  it('recusa região inválida', async () => {
    const res = await get('/api/cpf/gerar?regiao=SP');
    assert.equal(res.status, 400);
  });

  it('GET /api/cpf/validar informa validade e região', async () => {
    const valido = await (await get('/api/cpf/validar/111.444.777-35')).json();
    assert.deepEqual(valido, { cpf: '111.444.777-35', valido: true, regiao: 'ES e RJ' });

    const invalido = await (await get('/api/cpf/validar/123')).json();
    assert.deepEqual(invalido, { cpf: '123', valido: false, regiao: null });
  });

  it('serve a página com cabeçalhos de segurança', async () => {
    const res = await get('/');
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Gerador de CPF/);
    assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-powered-by'), null);
  });

  it('serve as regras de CPF para o navegador em /lib', async () => {
    const res = await get('/lib/cpf.js');
    assert.equal(res.status, 200);
    assert.match(await res.text(), /export function validarCpf/);
  });

  it('responde 404 em JSON para rotas desconhecidas', async () => {
    const res = await get('/nao-existe');
    assert.equal(res.status, 404);
    assert.ok((await res.json()).erro);
  });
});
