#!/usr/bin/env node
/**
 * Testes de fumaça/aceitação contra um ambiente no ar (staging ou produção).
 * Uso: node scripts/smoke-test.js <url-base> [commit-esperado] [--tentativas N]
 *
 * Espera o /health responder (com o commit esperado, se informado) e depois
 * verifica os fluxos principais da aplicação.
 */
import { validarCpf } from '../src/core/cpf.js';

const args = process.argv.slice(2);
const base = (args[0] || 'http://localhost:3000').replace(/\/$/, '');
const commitEsperado = args[1] && !args[1].startsWith('--') ? args[1] : null;
const iTentativas = args.indexOf('--tentativas');
const tentativas = iTentativas >= 0 ? Number(args[iTentativas + 1]) : 15;
const INTERVALO_MS = 5000;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function verificar(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
  console.log(`  ok  ${mensagem}`);
}

async function esperarNoAr() {
  for (let i = 1; i <= tentativas; i += 1) {
    try {
      const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) {
        const corpo = await res.json();
        if (!commitEsperado || corpo.commit === commitEsperado) return corpo;
        console.log(`  ... tentativa ${i}: no ar com o commit ${corpo.commit}, aguardando ${commitEsperado}`);
      } else {
        console.log(`  ... tentativa ${i}: /health respondeu ${res.status}`);
      }
    } catch (erro) {
      console.log(`  ... tentativa ${i}: ${erro.message}`);
    }
    await dormir(INTERVALO_MS);
  }
  throw new Error(`O ambiente ${base} não ficou saudável após ${tentativas} tentativas.`);
}

async function main() {
  console.log(`Smoke tests em ${base}`);

  const saude = await esperarNoAr();
  verificar(saude.status === 'ok', `/health ok (commit ${saude.commit})`);

  const pagina = await fetch(`${base}/`);
  verificar(pagina.ok && (await pagina.text()).includes('Gerador de CPF'), 'página inicial carrega');

  const { cpfs } = await (await fetch(`${base}/api/cpf/gerar?quantidade=5`)).json();
  verificar(Array.isArray(cpfs) && cpfs.length === 5, 'API gera 5 CPFs');
  verificar(new Set(cpfs).size === 5, 'CPFs gerados não se repetem');
  verificar(cpfs.every(validarCpf), 'todos os CPFs gerados são válidos');

  const validacao = await (await fetch(`${base}/api/cpf/validar/11144477735`)).json();
  verificar(validacao.valido === true, 'API valida um CPF conhecido');

  const limite = await fetch(`${base}/api/cpf/gerar?quantidade=6`);
  verificar(limite.status === 400, 'API respeita o limite de 5 por pedido');

  const lib = await fetch(`${base}/lib/cpf.js`);
  verificar(lib.ok, 'regras de CPF disponíveis para o navegador');

  console.log('Todos os smoke tests passaram.');
}

main().catch((erro) => {
  console.error(`FALHOU: ${erro.message}`);
  process.exit(1);
});
