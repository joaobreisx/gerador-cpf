# ADR 0001: Trunk-Based Development com branches curtas

**Status:** aceita

## Contexto
Projeto individual, com entregas pequenas e pipeline automatizado. Estratégias com branches longas (Git Flow) atrasariam a integração.

## Decisão
A `main` é sempre implantável e protegida. Cada mudança nasce em `feature/<issue>-<descricao>` ou `hotfix/<descricao>`, vive no máximo 1 a 2 dias e volta à `main` por Pull Request com o CI verde.

## Consequências
Integração frequente e conflitos pequenos. Exige testes automatizados confiáveis, já que o merge libera o deploy.
