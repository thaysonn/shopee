# Roteiro da demonstracao

## 1. Mensagem para o coordenador

> "Esta loja funciona, mas usa bibliotecas com vulnerabilidades conhecidas.
> O Dependabot identifica essas versoes e propoe atualizacoes por pull request.
> Nossa CI verifica se a aplicacao continua funcionando. Uma automacao separada
> cria a issue de acompanhamento. Uma pessoa revisa e faz o merge."

Distincoes importantes:

- **Alertas:** indicam dependencias afetadas por advisories conhecidos.
- **Security updates:** tentam abrir PRs que corrigem os alertas.
- **Version updates:** atualizam pacotes desatualizados, mesmo sem vulnerabilidade.
- **Issues:** nao sao criadas nativamente pelo Dependabot; aqui sao criadas
  pelo GitHub Actions quando existe um PR do bot.
- O Dependabot nao corrige qualquer bug escrito no codigo da loja.

## 2. O que foi colocado no laboratorio

| Pacote | Versao vulneravel | Advisory principal | Primeira correcao desse advisory |
| --- | --- | --- | --- |
| lodash | 4.17.20 | [GHSA-35jh-r3h4-6jhm](https://github.com/advisories/GHSA-35jh-r3h4-6jhm) | 4.17.21 |
| Newtonsoft.Json | 12.0.3 | [GHSA-5crp-9r3c-p9vr](https://github.com/advisories/GHSA-5crp-9r3c-p9vr) | 13.0.1 |

Os pacotes estao declarados diretamente nos manifestos. O lockfile npm deve
ser publicado junto com `package.json`.

As primeiras versoes corrigidas da tabela nao sao uma recomendacao de
"versao atualmente livre de qualquer advisory". A base de vulnerabilidades
evoluiu. A regressao local usa Lodash **4.18.1** e Newtonsoft.Json **13.0.4**
em uma copia isolada. O Dependabot pode selecionar outra versao resolvivel.

Lodash so ordena produtos; nao ha templates dinamicos. Newtonsoft.Json so le
o catalogo local controlado, com `MaxDepth = 16` e sem resolucao de tipos.
As entradas HTTP usam o serializador padrao do ASP.NET Core.

### Alertas extras no Angular CLI

A baseline auditada apresentou **17 entradas de pacotes npm afetados:
16 moderadas e uma alta**. A entrada alta e Lodash, com mais de um advisory.
As moderadas decorrem da cadeia de ferramentas Angular CLI 21, principalmente:

- [glob / GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4).
- [minimatch / GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).

A contagem do npm inclui pacotes ancestrais afetados pela mesma dependencia:
nao equivale a 17 falhas distintas nem garante o mesmo numero de alertas/PRs
no GitHub. Outros advisories do Lodash tambem podem aparecer.

Angular 21 foi escolhido para o Node ja instalado, conforme o escopo acordado.
Nao se aplicaram overrides de majors transitivas nem migracao forcada para
Angular 22, que exige um Node mais novo. A atualizacao isolada de Lodash nao
resolve a cadeia de ferramentas: os alertas moderados devem ser acompanhados
separadamente. Nao ignore nem encerre esses alertas apenas para "limpar" a demo.

## 3. Preparacao local

1. Execute a loja conforme o [README](../README.md).
2. Adicione dois Fones Aurora e uma Garrafa Horizonte.
3. Confira o total de **R$ 459,70** e finalize a compra simulada.
4. Execute builds, testes e auditorias.
5. Mantenha as versoes vulneraveis na baseline que sera publicada.

O backend rejeita carrinho vazio, produtos desconhecidos/repetidos, quantidades
fora de 1 a 99 e campos extras como preco enviado pelo cliente. Pedidos somem
ao reiniciar a API e a sacola some ao recarregar a pagina.

## 4. Publicar no GitHub

O repositorio desta POC ja foi publicado em
[thaysonn/shopee](https://github.com/thaysonn/shopee). As instrucoes abaixo
servem para reproduzir a demonstracao em outro repositorio.

Crie um repositorio **vazio**, de demonstracao, na sua conta/organizacao, sem
README inicial. Repositorio privado e suficiente, sujeito as politicas da
organizacao. Nao copie dados corporativos, credenciais ou codigo confidencial.

Na raiz local:

```powershell
git init -b main
git add .
git diff --cached --stat
git status --short
```

Revise os arquivos antes de continuar: `node_modules`, `bin`, `obj`, resultados
de testes e segredos nao devem estar incluidos. Depois:

```powershell
git commit -m "Add Dependabot ecommerce lab" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

Substitua os placeholders. Use o login Git/GitHub ja configurado na maquina;
nao coloque tokens no codigo, em URLs ou no terminal.

Nao e preciso hospedar a loja publicamente para o Dependabot funcionar.

## 5. Ativar os recursos

No repositorio, com permissao administrativa:

1. Em **Settings**, procure **Advanced Security** ou **Code security**,
   dependendo da interface disponivel.
2. Habilite **Dependency graph**.
3. Habilite **Dependabot alerts**.
4. Habilite **Dependabot security updates**.
   Para manter os exemplos separados, deixe **Grouped security updates** desativado.
5. Confirme que **Actions** e **Issues** estao habilitados.
6. Em **Actions > General**, confirme que as actions referenciadas e as
   permissoes declaradas nos workflows sao permitidas pela organizacao.

O YAML concede leitura de conteudo para CI; o workflow de issues concede
`issues: write` e `pull-requests: read`, sem PAT. Nao e necessario conceder
`write-all` ou autorizar a CI a aprovar PRs.

Os arquivos devem estar na **branch padrao**. O Dependabot analisa os
manifestos npm em `/frontend` e os projetos NuGet em `/backend`.

O YAML atual usa `open-pull-requests-limit: 1` por ecossistema e `allow` apenas
para `lodash` e `Newtonsoft.Json`. Assim, permite um PR de **versao** aberto por
ecossistema para esses pacotes, sem propor atualizacoes rotineiras de todo o
Angular ou dos pacotes de teste. Os demais alertas continuam visiveis.
O limite e o agendamento semanal se referem a atualizacoes de versao, nao
determinam o prazo de processamento dos alertas ou PRs de seguranca.

### Alternativa para a fila de seguranca pendente

Na configuracao inicial, o limite era `0`: isso e valido para usar somente
security updates e nao foi identificado como causa do bloqueio.
O GitHub detectou os pacotes e gerou os alertas, mas permaneceu em
**Creating a security update**, sem PR e sem erro informado, mesmo apos
desativar o agrupamento e reativar security updates uma vez.

Com autorizacao do usuario, foram habilitados version updates somente para os
dois pacotes. O objetivo e solicitar um job do Dependabot que possa ser
acompanhado, sem atualizar dependencias manualmente ou criar um PR falso.

1. Publique esta configuracao na branch padrao.
2. Abra **Insights > Dependency graph > Dependabot**.
3. Localize npm/frontend ou NuGet/backend e abra **Recent update jobs**.
4. Se ainda nao existir uma execucao em andamento, use **Check for updates**
   quando essa opcao estiver disponivel. O commit da configuracao tambem pode
   disparar a verificacao inicial.
5. Abra **View logs** e confira o resultado.
6. Se o bot abrir um PR, verifique o autor, o tipo da atualizacao e a versao
   resolvida. O workflow de issues funciona para PRs de versao e de seguranca.

**Como apresentar:** "O Dependabot detectou as vulnerabilidades. Solicitamos
tambem uma atualizacao direcionada de versao pelo proprio Dependabot, que
pode resolver esses alertas." Nao afirme que a fila original de security
updates foi corrigida sem evidencia. Nao ha garantia de criacao imediata de PR.

Depois da apresentacao e dos merges, pode-se voltar ao limite `0` nos dois
ecossistemas para desativar apenas os PRs de versao. Essa reversao nao e
automatica; mantenha os alertas e security updates ativos.

Antes da reuniao, confirme que os alertas e PRs reais ja apareceram. A
preparacao local nao pode comprovar o processamento remoto do GitHub.

## 6. Apresentacao pratica

1. **Loja:** mostre o catalogo, a sacola e uma compra simulada.
2. **Manifestos:** mostre Lodash 4.17.20 e Newtonsoft.Json 12.0.3.
3. **Security > Dependabot:** abra os alertas e mostre o advisory, a versao
   afetada e a sugestao de correcao.
4. **Pull requests:** abra um PR verdadeiro cujo autor seja `dependabot[bot]`.
   Mostre o diff do manifesto e do lockfile, quando aplicavel.
5. **Actions/checks:** mostre build, testes, auditorias e teste no navegador.
6. **Issues:** abra a issue vinculada ao PR e explique que foi criada pelo
   workflow adicional, nao pelo Dependabot.
7. **Revisao e merge manual:** integre primeiro o exemplo npm ou NuGet escolhido,
   sem aprovar automaticamente atualizacoes extras da cadeia Angular.
8. **Resultado:** confirme que a issue foi fechada, que o alerta correspondente
   foi resolvido apos reprocessamento e que a loja continua funcionando.

Atualize a copia local apos o merge:

```powershell
git pull --ff-only
dotnet test .\backend\DemoShop.slnx --configuration Release
Set-Location .\frontend
npm ci
npm test
npm run build
```

Repita as auditorias. E normal que a correcao de um pacote nao resolva os
alertas do outro ecossistema ou da cadeia de ferramentas.

### Ciclo de vida das issues

- Abertura do PR: cria uma issue com link e marcador estavel.
- Reexecucao/evento duplicado: reutiliza a mesma issue.
- PR fechado sem merge: issue permanece aberta com status de pendencia.
- PR reaberto: atualiza/reabre a issue.
- PR integrado: fecha a issue, mas orienta verificar o alerta no GitHub.
- Um evento atrasado usa o estado atual do PR e nao desfaz um merge.
- Alertas sem PR nao geram issue nesta POC.
- Um PR substituto e outro numero, portanto recebe outra issue. Se o bot
  substituir um PR fechado sem merge, relacione e resolva manualmente a issue
  antiga apos confirmar a correcao; nao ha reconciliacao entre PRs diferentes.

O workflow nao faz checkout ou build no evento privilegiado
`pull_request_target`; apenas usa metadados pela API. Os testes desse workflow
executam o mesmo script embutido no YAML com API mockada.

## 7. Troubleshooting

| Sintoma | O que verificar |
| --- | --- |
| Loja mostra erro no catalogo | API em localhost:5080, frontend iniciado com `npm start`, proxy e porta livres. |
| E2E reclama de porta em uso | Pare os servidores iniciados manualmente; o teste inicia seus proprios processos. |
| Alerta nao aparece | Branch padrao, manifestos/lockfile publicados, dependency graph e alerts ativos, politicas da organizacao. |
| Alerta existe mas nao ha PR | Security updates ativo, erro indicado no alerta, resolucao de versoes e logs do Dependabot. |
| Nenhum PR de versao aparece | Confira os jobs em Insights > Dependency graph > Dependabot, os pacotes permitidos e se ja existe um PR aberto no ecossistema. O limite atual e 1. |
| Alerta fica em Creating a security update | Nao execute a CI repetidamente. Confira erros no alerta e jobs do bot; a alternativa de versao direcionada acima nao comprova que a fila de seguranca foi destravada. |
| Issue nao aparece | Autor do PR, branch base padrao, Actions/Issues habilitados e log de `Dependabot PR issues`. O workflow precisa existir antes do evento. |
| Workflow retorna 403 | Permissoes do GITHUB_TOKEN e restricoes da organizacao; nao adicione PAT como atalho. |
| PR foi aberto antes do workflow existir | Feche e reabra o PR apropriado, se permitido, ou use a opcao de reexecucao quando houver uma execucao existente. |
| CI passa apesar dos alertas | Testes funcionais e relatorios de seguranca sao separados nesta POC. CI verde nao e aprovacao de seguranca. |
| PR adicional exige Angular/Node mais novos | Analise separadamente; nao faca merge forcado apenas para encerrar alertas. |
| Audit nao consegue acessar o registry | Corrija acesso/proxy/rede e repita. Falha de consulta nao comprova ausencia de vulnerabilidades. |
| Alerta continua apos o merge | Verifique a versao efetivamente resolvida, lockfile, branch padrao, outras ocorrencias e processamento do GitHub. |

Nao crie um PR manual dizendo que ele foi gerado pelo Dependabot. Se o bot
nao conseguir corrigir um alerta, mostre o motivo como uma limitacao real.

## 8. Limites da entrega

### Evidencias da validacao local

| Verificacao | Baseline vulneravel | Copia com os dois pacotes corrigidos |
| --- | --- | --- |
| Build Angular | Passou | Passou |
| Testes Angular | 13 passaram | 13 passaram |
| Build/testes API em Release | 15 testes passaram | 15 testes passaram |
| Navegador: compra, erros e mobile | 3 passaram | 3 passaram |
| Automacao de issues com API mockada | 13 passaram | Mesmo workflow, sem mudanca |
| Auditoria npm | Lodash alto + 16 entradas moderadas | Sem Lodash afetado; 16 entradas moderadas restantes |
| Auditoria NuGet | Newtonsoft.Json 12.0.3 afetado | Nenhum pacote vulneravel encontrado nas fontes consultadas |

Tambem foi validada uma instalacao limpa com `npm ci`, e os YAMLs foram
processados pelo parser do Prettier. Os testes da automacao executam o script
real do workflow, incluindo idempotencia e transicoes de estado.

As correcoes foram aplicadas apenas em copia temporaria isolada
(`lodash@4.18.1` e `Newtonsoft.Json@13.0.4`), removida ao terminar a verificacao.
O projeto entregue preserva Lodash 4.17.20 no manifesto e no lockfile e
Newtonsoft.Json 12.0.3 no projeto da API.

**Verificado remotamente:** a CI executou com sucesso no GitHub, o Dependency
graph reconheceu Lodash 4.17.20 e Newtonsoft.Json 12.0.3, e os alertas foram
criados. Alerts e security updates estao ativos, com agrupamento desativado.

**Ainda a verificar:** criacao real dos PRs/issues e fechamento apos merge.
O processamento de security updates permaneceu pendente na tentativa inicial.

### Restricoes

- A loja e os testes sao executaveis localmente.
- Manifestos, lockfile, YAML e comportamento da automacao sao verificaveis
  localmente, mas a criacao real de alertas, PRs e issues depende do GitHub.
- Nao existe garantia de exatamente dois alertas ou dois PRs.
- O laboratorio nao inclui exploracao de falhas nem prova de explorabilidade.
- A API nao tem autenticacao, persistencia ou limites de armazenamento de
  pedidos adequados a producao. Restrinja a execucao ao localhost.

## Fontes

- [Dependabot security updates](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-security-updates).
- [Opcoes de configuracao](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference).
- [Dependabot com Actions](https://docs.github.com/en/code-security/reference/supply-chain-security/troubleshoot-dependabot/dependabot-on-actions).
