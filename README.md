# Gerador de CPF

Gera CPFs válidos para **testes de software**: cada número passa no cálculo dos dígitos verificadores (módulo 11), nunca se repete no histórico e pode ser copiado com ou sem pontuação.

> Os números são fictícios e servem apenas para preencher formulários e bancos de dados de teste.

## Funcionalidades

- Gerar CPF / gerar novo CPF, com animação dos dígitos e destaque dos dígitos verificadores
- Escolha da região fiscal (o 9º dígito indica o estado de emissão)
- Histórico salvo no navegador, sem CPFs repetidos
- Adicionar CPF manualmente, com anotação opcional e indicação de válido/inválido
- Limite de 5 gerações por sessão sem login (recarregar a página libera mais 5)
- Busca, cópia, remoção, exportação em `.txt` e limpeza do histórico
- Tema claro/escuro, atalho de teclado `G`, painel fixo na rolagem e barra flutuante no celular
- API REST: `GET /api/cpf/gerar`, `GET /api/cpf/validar/:cpf`, `GET /health`

## Rodando localmente

Requer Node.js 22.

```bash
npm ci
npm run dev          # http://localhost:3000
npm run lint
npm test
npm run test:coverage
```

Com Docker:

```bash
docker build -t gerador-cpf .
docker run -p 3000:3000 gerador-cpf
```

## Estrutura

```
.
├── .github/
│   ├── workflows/pipeline.yml   # CI/CD: lint, testes, SCA, imagem, homologação, produção, baseline
│   ├── workflows/codeql.yml     # SAST
│   ├── dependabot.yml           # atualização automática de dependências
│   └── pull_request_template.md
├── docs/adr/                    # decisões de arquitetura
├── public/                      # interface (HTML, CSS, JS)
├── scripts/smoke-test.js        # testes de fumaça/aceitação contra um ambiente no ar
├── src/
│   ├── core/                    # regras de negócio puras (CPF, histórico, limite)
│   ├── app.js                   # API Express
│   └── server.js                # ponto de entrada
├── tests/
│   ├── unit/
│   └── integration/
├── Dockerfile
└── render.yaml                  # IaC do ambiente de produção (Render Blueprint)
```

## Fluxo de trabalho

1. Crie uma issue para a mudança.
2. Crie a branch `feature/<numero-da-issue>-<descricao>` a partir da `main`.
3. Faça commits no padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/): `feat(historico): exporta em txt`.
4. Abra um Pull Request para a `main`. O pipeline de CI precisa passar.
5. Após o merge, o pipeline publica a imagem, testa em homologação, faz deploy em produção e cria a tag de versão (SemVer) com as notas da release.

## Configuração inicial do repositório (uma vez só)

1. **Crie o repositório** `gerador-cpf` no GitHub (público) e envie o código:

   ```bash
   git init -b main
   git add .
   git commit -m "feat: primeira versão do gerador de CPF" -m "BREAKING CHANGE: versão inicial estável"
   git remote add origin https://github.com/joaobreisx/gerador-cpf.git
   git push -u origin main
   ```

   O rodapé `BREAKING CHANGE` faz a primeira tag sair como `v1.0.0`.

2. **Proteja a branch `main`** em *Settings → Branches → Add rule*: exigir Pull Request e exigir o status check **CI - lint, testes e segurança** antes do merge. Como o trabalho é individual, deixe o número de aprovações em 0 e use o checklist do template de PR como autorrevisão.

3. **Deixe a imagem pública** depois do primeiro pipeline: em *Packages → gerador-cpf → Package settings → Change visibility → Public*. O Render precisa disso para baixar a imagem.

4. **Produção no Render (opcional, mas recomendado)**:
   - No Render, crie um *Web Service → Deploy an existing image* com `ghcr.io/joaobreisx/gerador-cpf:latest`, plano Free e health check em `/health`.
   - Em *Settings → Deploy Hook*, copie a URL.
   - No GitHub, em *Settings → Secrets and variables → Actions*:
     - Secret `RENDER_DEPLOY_HOOK` = URL do deploy hook
     - Variable `PROD_URL` = endereço do serviço (ex.: `https://gerador-cpf.onrender.com`)
   - Sem esses valores, o pipeline pula o deploy em produção com um aviso e o restante continua funcionando.

5. **Gate manual de release (opcional)**: em *Settings → Environments → production*, adicione você como *required reviewer*. O deploy em produção passa a esperar sua aprovação.

## Rollback

Toda versão aprovada fica no registro como `ghcr.io/joaobreisx/gerador-cpf:<versão>`. Para voltar, use *Rollback* no painel do Render ou chame o deploy hook com a imagem da versão anterior.
