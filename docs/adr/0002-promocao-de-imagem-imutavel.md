# ADR 0002: Promover a mesma imagem entre ambientes

**Status:** aceita

## Contexto
Recompilar o código a cada ambiente permite que produção rode algo diferente do que foi testado.

## Decisão
O CI gera uma única imagem Docker identificada pelo commit (`sha-<7 caracteres>`). Homologação e produção usam essa mesma imagem. Depois do deploy em produção, a imagem recebe também a tag da versão SemVer e `latest`, sem novo build.

## Consequências
O que foi testado é exatamente o que vai ao ar, e o `/health` mostra o commit em execução. Rollback é trocar a imagem pela da versão anterior.
