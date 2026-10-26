# Simulados

Simulados para certificações, com prova cronometrada seguindo os pesos oficiais e consulta de questões comentadas. Publicado em [simulados.lucasmesquita.dev.br](https://simulados.lucasmesquita.dev.br).

Projeto pessoal e não oficial. As questões foram geradas com IA a partir do Microsoft Learn e podem conter erros.

## Funcionalidades

- **Simulado:** questões sorteadas dentro das faixas de peso de cada domínio e espalhadas entre os tópicos; cronômetro; marcar para revisão; confiança por questão; desistir; resultado em porcentagem e na escala da prova, revisão com tipo de erro e export em CSV.
- **Questões:** consulta com busca e filtros na URL (domínio, tópico, formato, nível), modo estudo, ordem embaralhada e link direto para cada questão.
- Cinco formatos da prova real: escolha única, múltipla escolha, Sim/Não, completar e associação.
- PT/EN, modo escuro, atalhos de teclado (`?` mostra a lista).

Detalhes em [docs/funcionalidades.md](docs/funcionalidades.md) (comportamento de referência) e [docs/plano.md](docs/plano.md) (arquitetura e decisões).

## Desenvolvimento

Requer Node 22.18 ou mais recente (os scripts de conteúdo são TypeScript executado direto pelo Node).

```bash
npm ci
npm run dev        # gera public/data/ e sobe o Vite
npm test           # valida o conteúdo e roda os testes
npm run lint
npm run build      # conteúdo + typecheck + build (dist/, com 404.html para o GitHub Pages)
npm run preview    # serve o build de produção
```

## Conteúdo

As questões ficam no repositório, versionadas, e são validadas no build:

```
content/<prova>/exam.json             outline, pesos, tempo, nota de corte
content/<prova>/questions/<req>.json  questões e gabarito de cada requisito
```

`npm run content` valida tudo com o schema de `src/content/schema.ts` (IDs únicos, gabarito apontando para opções existentes, lacunas do "completar", requisitos do outline etc.) e gera `public/data/`. Qualquer erro interrompe o build.

Para importar questões no formato CSV do gerador:

```bash
npm run content:import -- --exam az-900 --questions questoes.csv --answers gabarito.csv
```

## Segurança

- Todo o conteúdo é renderizado como texto (nenhum `dangerouslySetInnerHTML`).
- Content Security Policy via `<meta>` no build (`default-src 'self'`, sem scripts ou estilos inline).
- Links externos restritos a `https://learn.microsoft.com`, com `rel="noopener noreferrer"`.
- Dados do `localStorage` validados com schema; dados inválidos são descartados.
- Export de CSV protegido contra injeção de fórmula.
- CI com `npm ci`, `npm audit`, lint, testes e permissões mínimas; Dependabot para npm e actions.

## Deploy

Cada push na `main` roda o workflow `.github/workflows/deploy.yaml` (lint, testes, build) e publica no GitHub Pages. Pull requests rodam as mesmas verificações, sem publicar.
