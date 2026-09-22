# ADR 0003: Histórico no navegador e sem login

**Status:** aceita

## Contexto
A ferramenta gera dados de teste fictícios. Autenticação exigiria banco de dados, armazenamento de senhas e gestão de segredos, sem ganho para o objetivo do projeto.

## Decisão
O histórico fica no `localStorage` do navegador. Sem login, cada sessão (carregamento da página) permite 5 gerações; recarregar libera mais 5. A API também limita 5 CPFs por pedido.

## Consequências
Nenhum dado de usuário é armazenado no servidor, que fica sem estado e fácil de escalar e reverter. O histórico não é compartilhado entre dispositivos. Login pode ser reavaliado em outra ADR, se for exigido.
