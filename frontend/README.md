# Vitrine - frontend

Angular 21, Node 24 e npm 11. Este projeto contem uma dependencia
intencionalmente vulneravel e deve ser executado somente como laboratorio local.

Consulte o [guia principal](../README.md) para iniciar a API e o frontend,
executar os testes e entender a demonstracao do Dependabot.

Comandos nesta pasta:

```powershell
npm ci
npm start
npm test
npm run build
```

O servidor local usa `http://localhost:4200` e encaminha `/api` para
`http://localhost:5080`. Nao existe fallback para dados falsos se a API falhar.
