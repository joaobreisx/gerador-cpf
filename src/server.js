import { criarApp } from './app.js';

const porta = Number(process.env.PORT) || 3000;
const servidor = criarApp().listen(porta, () => {
  console.log(`Gerador de CPF ouvindo em http://localhost:${porta}`);
});

// Encerramento limpo quando o container recebe SIGTERM (deploy/rollback).
for (const sinal of ['SIGTERM', 'SIGINT']) {
  process.on(sinal, () => {
    servidor.close(() => process.exit(0));
  });
}
