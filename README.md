# Vitrine - Dependabot Lab

Uma loja ficticia em **Angular 21 + ASP.NET Core 10** para demonstrar:

**dependencia vulneravel -> alerta -> PR do Dependabot -> issue via Actions ->
testes -> merge manual -> resolucao do alerta.**

> **Somente laboratorio local.** Ha dependencias intencionalmente vulneraveis.
> Nao publique a aplicacao na internet, nao use dados reais e nao reutilize esta
> baseline em producao. Publicar o codigo em um repositorio de demonstracao nao
> significa fazer deploy da aplicacao.

## O que esta pronto

- Catalogo com seis produtos, filtros, sacola e checkout simulado.
- Interface responsiva em portugues; valores em reais.
- API que valida IDs e quantidades inteiras de 1 a 99 e calcula o total.
- Carrinho no navegador e pedidos na memoria da API; nada persiste ao reiniciar.
- Dependabot para npm e NuGet, com atualizacoes de versao direcionadas somente
  a Lodash e Newtonsoft.Json, alem dos recursos de seguranca habilitados no GitHub.
- CI com build, testes e auditorias visiveis.
- Automacao idempotente de uma issue por PR do Dependabot.

Nao ha login, pagamento, banco de dados, deploy, exploracao de vulnerabilidades
ou auto-merge. Erros da API sao exibidos; nao existe fallback para um catalogo
falso quando o backend esta indisponivel.

## Executar localmente

Requisitos:

- SDK .NET **10.0.201**, ou patch compativel, conforme [global.json](global.json).
- Node **24.3.0** e npm **11**, conforme [.nvmrc](.nvmrc).
- Acesso aos registries npm e NuGet para restaurar os pacotes.

Nao e necessario instalar Angular CLI globalmente.

Na raiz do projeto, em um terminal PowerShell:

```powershell
dotnet run --project .\backend\DemoShop.Api --launch-profile http
```

Em outro terminal, tambem partindo da raiz:

```powershell
Set-Location .\frontend
npm ci
npm start
```

Abra **http://localhost:4200**. A API responde em
**http://localhost:5080/api/products**. O Angular encaminha `/api` para a API
pelo proxy de desenvolvimento, sem abrir CORS para qualquer origem.

Finalize os processos com `Ctrl+C` nos respectivos terminais.

## Validacao

Da raiz:

```powershell
dotnet build .\backend\DemoShop.slnx --configuration Release
dotnet test .\backend\DemoShop.slnx --configuration Release
node --test .\scripts\dependabot-issues.test.cjs
node .\scripts\audit-npm.cjs
dotnet list .\backend\DemoShop.slnx package --vulnerable --include-transitive
```

Dentro de `frontend`:

```powershell
npm run build
npm test
```

### Navegador real

Pare os servidores manuais antes deste teste. O Playwright inicia e encerra
seus proprios servidores nas portas 5080 e 4200; nao reutiliza processos existentes.

Dentro de `frontend`, instale o navegador uma vez e execute:

```powershell
$env:PLAYWRIGHT_SKIP_BROWSER_GC = "1"
npx playwright install chromium
npm run test:e2e
```

O teste cobre compra real na API, erros de catalogo/checkout e tela mobile.
Capturas de tela ficam em `frontend/test-results`, fora do controle de versao.

### Resultado de seguranca nao e o mesmo que resultado funcional

Os testes funcionais devem passar **mesmo na baseline vulneravel**. O aviso
NuGet `NU1903` e o resultado nao-zero do `npm audit` sao esperados para os
pacotes do laboratorio e nao devem ser ocultados.

O script `audit-npm.cjs` aceita o resultado de vulnerabilidades como relatorio,
mas falha em erros de execucao, JSON invalido ou erro retornado pelo registry.
Essa escolha existe apenas para a POC: **CI verde nao significa ausencia de
vulnerabilidades**. Em producao, defina uma politica de bloqueio apropriada.

## Dependencias escolhidas

| Ecossistema | Baseline intencional | Advisory principal |
| --- | --- | --- |
| npm | `lodash@4.17.20` | [CVE-2021-23337 / GHSA-35jh-r3h4-6jhm](https://github.com/advisories/GHSA-35jh-r3h4-6jhm) |
| NuGet | `Newtonsoft.Json@12.0.3` | [CVE-2024-21907 / GHSA-5crp-9r3c-p9vr](https://github.com/advisories/GHSA-5crp-9r3c-p9vr) |

Lodash apenas ordena o catalogo. Newtonsoft.Json apenas le um JSON local
confiavel, com profundidade limitada. Nenhuma operacao de exploracao e exposta.
O Dependabot identifica versoes afetadas sem precisar executar um ataque.

**Ha alertas adicionais:** a auditoria inicial tambem encontrou dependencias
transitivas moderadas da ferramenta Angular CLI 21, associadas a `glob` e
`minimatch`, alem de outros advisories do Lodash. Nao sao vulnerabilidades
intencionalmente escritas na aplicacao. Veja a analise e os limites no
[roteiro de demonstracao](docs/dependabot-demo.md).

**Nao execute `npm audit fix --force` antes da apresentacao.** Isso pode corrigir
o exemplo antecipadamente ou atualizar o Angular para uma versao incompatível
com o Node definido neste laboratorio.

## Publicar e apresentar

O projeto esta publicado em [thaysonn/shopee](https://github.com/thaysonn/shopee).
Siga o [roteiro de demonstracao](docs/dependabot-demo.md) para executar e
apresentar a POC, ou reproduzi-la em outro repositorio.

A fila de security updates permaneceu pendente mesmo com os recursos ativos.
Como alternativa autorizada para a demonstracao, o YAML tambem permite
**1 PR de versao por ecossistema**, restrito aos dois pacotes do laboratorio.
Use **Insights > Dependency graph > Dependabot > Recent update jobs** para
acompanhar a execucao e **Check for updates**, quando disponivel, para solicita-la.
Essa alternativa nao comprova que a fila original de security updates foi
destravada: um PR de versao tambem pode corrigir vulnerabilidades.

O arquivo [.github/dependabot.yml](.github/dependabot.yml) **nao habilita sozinho**
Dependency graph, Dependabot alerts ou Dependabot security updates. Esses
recursos precisam estar ativos no GitHub e permitidos pela organizacao.

## Arquivos principais

- [Frontend](frontend/src/app): componentes, estado da sacola e chamadas HTTP.
- [API](backend/DemoShop.Api): produtos, pedidos e validacoes.
- [Testes da API](backend/DemoShop.Api.Tests/ShopTests.cs).
- [CI](.github/workflows/ci.yml).
- [Workflow de issues](.github/workflows/dependabot-issues.yml).
- [Testes da automacao](scripts/dependabot-issues.test.cjs).

O workflow de issues usa somente metadados via API e permissoes minimas.
Ele nao faz checkout nem executa codigo do PR no evento `pull_request_target`.
