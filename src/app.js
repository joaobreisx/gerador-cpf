import { fileURLToPath } from 'node:url';
import path from 'node:path';
import express from 'express';
import { formatarCpf, gerarCpfUnico, limpar, regiaoDoCpf, validarCpf } from './core/cpf.js';
import { LIMITE_PADRAO } from './core/limite.js';

const raiz = path.dirname(fileURLToPath(import.meta.url));

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
].join('; ');

function cabecalhosDeSeguranca(_req, res, next) {
  res.set({
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
  });
  next();
}

/**
 * Cria a aplicação Express. Separado do server.js para os testes
 * de integração subirem a API em uma porta aleatória.
 */
export function criarApp({ commit = process.env.GIT_SHA || 'local' } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cabecalhosDeSeguranca);

  app.get('/health', (_req, res) => {
    // O commit identifica exatamente qual imagem está no ar (ligado à tag de release).
    res.json({ status: 'ok', commit });
  });

  app.get('/api/cpf/gerar', (req, res) => {
    const quantidade = req.query.quantidade === undefined ? 1 : Number(req.query.quantidade);
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > LIMITE_PADRAO) {
      return res.status(400).json({ erro: `A quantidade deve ser um número de 1 a ${LIMITE_PADRAO}.` });
    }

    const regiao = req.query.regiao;
    if (regiao !== undefined && regiao !== '' && !/^\d$/.test(String(regiao))) {
      return res.status(400).json({ erro: 'A região deve ser um dígito de 0 a 9.' });
    }

    const formatado = req.query.formatado !== 'false';
    const gerados = [];
    for (let i = 0; i < quantidade; i += 1) {
      gerados.push(gerarCpfUnico(gerados, { regiao }));
    }
    return res.json({ cpfs: formatado ? gerados.map(formatarCpf) : gerados });
  });

  app.get('/api/cpf/validar/:cpf', (req, res) => {
    const digitos = limpar(req.params.cpf);
    res.json({
      cpf: formatarCpf(digitos),
      valido: validarCpf(digitos),
      regiao: digitos.length === 11 ? regiaoDoCpf(digitos) : null,
    });
  });

  // O front-end importa as mesmas regras de CPF usadas pela API.
  app.use('/lib', express.static(path.join(raiz, 'core')));
  app.use(express.static(path.join(raiz, '..', 'public')));

  app.use((_req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

  return app;
}
