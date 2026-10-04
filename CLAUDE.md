# soap-estudos

Projeto de estudo: criar e consumir uma API SOAP do zero e, numa segunda fase, isolar a regra de negócio para trocar persistência e transporte em tempo real. O README.md descreve o projeto para quem o usa; este arquivo guarda o contexto de trabalho.

**Este arquivo é a única memória entre conversas.** O usuário troca de chat (e de agente) com frequência para poupar tokens. Toda decisão, explicação relevante ou mudança de estado deve ser registrada aqui na mesma conversa em que acontece. **Reescreva o trecho afetado em vez de empilhar notas datadas**: em 04/10 a seção "Onde estamos" virou uma pilha de "prevalece sobre o item acima" e precisou ser refeita.

## Modo de trabalho (IMPORTANTE)

- O usuário **nunca tinha feito SOAP** e quer aprender **codando na mão**. Gosta de desafio ("adoro sofrer"): não simplificar o caminho a ponto de tirar o aprendizado.
- **Ele vem do NestJS.** Analogias que funcionaram: DTO por operação, providers e módulo (injeção de dependência), *exception filters* (o tradutor de Faults), `index.ts` de pasta (barrel). Gosta de POO, camadas e tipagem.
- Papel do Claude: **mentor**. Explicar conceitos, propor o próximo passo, dar esqueletos/dicas e revisar o código do usuário. **Não escrever as implementações** sem que o usuário peça.
- **Dosagem da ajuda:** primeiro o conceito e a linha exata do problema. Se a dica em palavras não resolver em uma ou duas rodadas, mostrar **no chat** as linhas certas (no tradutor de Faults a mesma dica foi repetida três vezes antes de o código ser mostrado; era para ter mostrado antes). Código pronto vai sempre no chat, nunca gravado em `src/`.
- **A infra e a documentação são do Claude:** pode editar `package.json`, Docker, `.env.example`, `.gitignore`, `.devcontainer`, README e este arquivo. O código em `src/` (fora de `src/setup/`) é do usuário: revisar e apontar, não alterar.
- **Ciclo de revisão** (o usuário escreve "confira", "dê uma olhada"): seguir a seção "Como conferir o código do usuário". Ele gosta de ver o comportamento verificado na prática, em tabela.
- Para testar algo isolado, usar arquivo temporário e apagar em seguida.
- **Testar antes de afirmar** (ver "Erros do Claude").
- Idioma: português (pt-BR).
- Avançar uma operação por vez, de ponta a ponta, antes de adicionar a próxima.
- **Reorganização:** em 01/10 o usuário decidiu terminar a Fase 1 antes de reorganizar. Em 04/10 abriu **uma exceção consciente**: antecipar a porta do repositório e a injeção de dependência, para não reescrever quatro operações depois. Só isso; a divisão em pastas `domain/application/adapters` continua na etapa 7.
- O usuário renomeia arquivos e classes **entre uma mensagem e outra**. **Sempre reler a árvore antes de revisar**; não confiar na estrutura descrita aqui.
- **Datas** neste arquivo: `dd/mm` de 2026, no **horário do usuário (UTC-3)**. O relógio do container é UTC: depois das 21h do usuário, `date` já mostra o dia seguinte. Converter antes de falar de datas.

### Escolhas do usuário que não devem ser reapontadas

- Não usa `;` depois de `{`/`}` (blocos, classes, objetos lançados).
- `UserValidate` como nome da classe (o Claude sugeriu `UserValidator`) e métodos com o **nome da operação** (`getUser`, `createUser`…), de propósito.
- O parâmetro da arrow no `find` do tradutor chamar `fault`, igual à `const` (acha legível).
- HTTP **404** para "não encontrado" e **400** para validação, mesmo sabendo que o SOAP 1.1 pede 500 para todo Fault.
- `{{PORT}}` no WSDL trocado com `replace`; arquivos de infra em `src/setup/`.
- `=== false` e a mensagem "Tipo de identificador inválido" no validador: mencionados uma vez, sem insistir.

## Onde estamos (fim de 04/10)

**Fase 1, etapa 3 concluída:** `GetUser` funciona de ponta a ponta, com erros tipados traduzidos em SOAP Fault. `typecheck` passa e a bateria completa foi conferida no servidor real às 20h20 de 04/10.

Caminho de uma requisição hoje:

```
server.ts → soap.listen("/user") → UserWebService.UserService.UserPort.GetUser(args)   [user-endpoint.ts]
  try    UserValidate.getUser(args.id)          lança UserValidateError
         UserService.getUser(args.id)           lança UserNotFoundError
           └─ UserRepository.getUser(id) → XMLService.read() + XPath
  catch  throw faultTranslator.translate(error) [fault-translator.ts] Fault 1.1, ou o erro original
```

### Próximo passo: porta do repositório + injeção de dependência (só no `GetUser`)

É do usuário; ainda não começou (a pasta `src/user/ports/` existe só com um `a.txt` para versionar a pasta; some quando a interface entrar). Passos combinados, com `typecheck` a cada um e a bateria no fim:

1. `ports/user-repository.ts`: `interface UserRepository { findById(id: number): UserType | null }` (só nomes neutros, nada de XML).
2. A classe atual vira `XmlUserRepository implements UserRepository` (arquivo `xml-user-repository.ts`, no mesmo lugar), com método de instância.
3. `UserService` vira instância e recebe o repositório pelo construtor: `constructor(private readonly users: UserRepository) {}`. O import do service aponta para a **interface**, nunca para a classe XML.
4. O endpoint deixa de ser uma `const` e vira uma função (ou fábrica) que recebe o service e devolve o `IServices`. **Só foi explicado em palavras**; é o ponto onde ele pode travar.
5. O `server.ts` cria `XmlUserRepository` → `UserService` → endpoint. É a raiz de composição (o "módulo" do NestJS).

`UserValidate` e o tradutor não têm dependências e podem continuar `static`. Os outros métodos da interface (`findAll`, `create`, `update`, `delete`) entram um por operação, não todos de uma vez.

### Depois: etapa 4 (resto do CRUD)

Ordem sugerida: `CreateUser` (estreia a escrita: `XMLService.write` e o `nextId`) → `ListUsers` → `UpdateUser` → `DeleteUser`. Por operação: método na porta → implementação XML → service → validação → erro novo na tabela do tradutor (se houver) → WSDL → `user-wsdl-types.ts` → endpoint → bateria.

A conferir pelo Claude na hora, **não testado ainda:**

- Como a lib serializa e o cliente lê **listas** no `ListUsers` (lista vazia e lista de um item).
- `XMLService.write` nunca foi executado (nada o chama).
- O teto de 999 ids contra o `nextId` no `CreateUser`.

### Visto na última releitura e ainda não comentado com o usuário

- O tradutor foi renomeado para `fault-translator.ts` e a classe para **`faultTranslator`** (camelCase; as demais classes são PascalCase). O arquivo perdeu o prefixo `user-`, mas continua dependendo de `UserErrors` e `UserFaultsType`. Perguntar a intenção (tradutor genérico, compartilhado entre domínios?) antes de sugerir qualquer coisa.
- No endpoint, a `const` que guarda o `GetUserResponse` se chama `user`.

## Como conferir o código do usuário

1. `find src -type f -not -path "*/setup/*" | sort` e ler os arquivos mexidos.
2. `npm run typecheck`. O `tsx` roda mesmo com erro de tipo, então código que não compila pode estar no ar.
3. Bateria no servidor real (já roda na 8000 e reinicia sozinho a cada arquivo salvo). Rodar de `/app`:

```bash
node -e '
const env=(b)=>`<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://soap-estudos.local/user"><soapenv:Body>${b}</soapenv:Body></soapenv:Envelope>`;
const post=async(label,b)=>{try{const r=await fetch("http://localhost:8000/user",{method:"POST",headers:{"Content-Type":"text/xml; charset=utf-8","SOAPAction":"\"http://soap-estudos.local/user/GetUser\""},body:env(b),signal:AbortSignal.timeout(4000)});const t=await r.text();console.log(label.padEnd(12),"->",r.status,t.replace(/^.*<soap:Body>|<\/soap:Body>.*$/g,"").slice(0,230));}catch(e){console.log(label.padEnd(12),"-> ERRO",e.name,e.cause?.code||"")}};
(async()=>{
const w=await fetch("http://localhost:8000/user?wsdl");console.log("wsdl",w.status,(await w.text()).match(/location="[^"]*"/)?.[0]);
for (const v of ["1","2","3","99","007","abc","","0","-1","1000","3.9","2abc"]) await post("id="+JSON.stringify(v),`<tns:GetUserRequest><tns:id>${v}</tns:id></tns:GetUserRequest>`);
await post("sem filhos","<tns:GetUserRequest/>");
const soap=await import("soap");
const c=await soap.createClientAsync("http://localhost:8000/user?wsdl");
console.log("cliente id 2:",JSON.stringify((await c.GetUserAsync({id:2}))[0]));
for (const id of [99,0]) try{await c.GetUserAsync({id},{timeout:4000})}catch(e){console.log("cliente id",id,"rejeita:",e.message,"| status",e.response?.status)}
})().catch(e=>console.log("ERRO",e.cause?.code||e.message))'
```

Resultado esperado (o de 04/10; qualquer diferença depois da refatoração é regressão):

| Entrada | HTTP | Resposta |
|---|---|---|
| `?wsdl` | 200 | `location="http://localhost:8000/user"` |
| `1`, `2`, `3` | 200 | John Doe, Jane Smith, Bob Johnson dentro de `<user>` |
| `99`, `007` | 404 | Fault `soap:Client`, "Usuário não encontrado" |
| `abc`, vazio | 400 | Fault `soap:Client`, "Tipo de identificador inválido" |
| `0`, `-1`, `1000` | 400 | Fault `soap:Client`, "Identificador fora do intervalo permitido" |
| `3.9`, `2abc` | 200 | usuários 3 e 2 (`parseInt` da lib; adiado) |
| `<GetUserRequest/>` | 500 | Fault formato 1.2, `TypeError: Cannot read properties of null (reading 'id')` (adiado) |
| cliente `soap`, id 2 | | `{"user":{"id":2,...}}`, `id` como `number` |
| cliente `soap`, id 99 e 0 | 404 e 400 | promise rejeitada com `soap:Client: <mensagem>` |

Como ler as falhas:

- `ECONNREFUSED`: o servidor caiu, quase sempre por import apontando para arquivo renomeado. O `typecheck` mostra (`TS2307`); o `tsx watch` volta sozinho ao corrigir.
- `TimeoutError`: o handler devolveu `undefined` (ex.: `catch` que chama o tradutor sem `throw`). A lib não responde nunca.
- Tudo 500 com `TypeError`/`ReferenceError` na mensagem: o erro é do próprio tradutor ou do endpoint.

Resposta ao usuário: o que o teste mostrou (tabela), o que está errado (arquivo:linha e o porquê), o que ficou certo.

## Roteiro

### Fase 1: SOAP

- [x] 0. Setup (Docker + package.json, feitos pelo Claude)
- [x] 1. WSDL com `GetUser`
- [x] 2. Banco XML + `XMLService` + repositório + service
- [x] 3. Servidor com `GetUser` de ponta a ponta, erros tipados e Faults (fechada em 04/10)
- [ ] 3b. Porta do repositório + injeção de dependência, só no `GetUser` (**próximo passo**)
- [ ] 4. Demais operações (`CreateUser`, `ListUsers`, `UpdateUser`, `DeleteUser`), uma por vez
- [ ] 5. Cliente Node (`src/client.ts`)
- [ ] 6. Página HTML (servida pelo próprio servidor, para evitar CORS): uma única página, sem CSS, com `fetch` e envelopes montados à mão

### Fase 2: portas e adaptadores (ver seção "Fase 2")

Ordem proposta pelo Claude; o usuário gostou, mas as etapas 8 e 9 podem alternar:

- [ ] 7. Refatorar para portas e adaptadores (pastas, casos de uso, validação descendo para o núcleo), com as cinco operações.
- [ ] 8. Persistência, **quatro formas**: memória (também prova o isolamento) → JSON → arquivo de texto, além do XML existente.
- [ ] 9. Transportes: REST → GraphQL → gRPC, além do SOAP.
- [ ] 10. Troca em tempo real, sem reiniciar a aplicação.

### Testes

O usuário **quer escrever testes** (dito em 04/10) e adiou duas pendências para esse momento. Ainda não há etapa, ferramenta nem momento definidos: combinar com ele.

## Decisões em vigor (Fase 1)

- **Stack:** Node.js + **TypeScript (strict máximo, POO)** com a lib [`soap`](https://www.npmjs.com/package/soap) 1.13 (servidor e cliente).
- **Contract-first:** o usuário escreve o WSDL na mão (WSDL 1.1, SOAP 1.1, estilo **document/literal**).
- **Domínio:** Usuário (CRUD: `CreateUser`, `GetUser`, `ListUsers`, `UpdateUser`, `DeleteUser`). Nomes em inglês (`User`, `name`, `email`), sem senha.
- **Persistência:** arquivo XML como banco (escolha do usuário, para praticar XML), com `@xmldom/xmldom` + `xpath`. É a mesma API DOM que o navegador usa com `DOMParser` (etapa 6).
- **Camadas** (conclusão do próprio usuário: o transporte é só a "ponte"): `server` → `endpoint` (com `validate` e `fault-translator`) → `service` → `repository` → `xml-service`. Conhecem SOAP: `server.ts`, `user-endpoint.ts`, `fault-translator.ts`, `user.wsdl`, `user-wsdl-types.ts`, `user-faults-type.ts`. O resto não. Teste ensinado: "se eu apagar o SOAP, este arquivo sobrevive?".
- **`id` é `number` de ponta a ponta** (`UserType`, service, repositório) e `xsd:int` no WSDL. Decidido em 04/10; encerra a antiga dúvida `string` contra `number`. Como o XPath recebe um número, não há mais injeção por esse caminho.
- **Validação** em `UserValidate`, um método estático por operação. `getUser`: `Number.isInteger` + faixa de 1 a 999 (teto de 999 usuários aceito pelo usuário). Hoje quem a chama é o endpoint; é regra de negócio, então na etapa 7 desce para o caso de uso (explicado; não mexer agora).
- **"Não encontrado" é erro, não resposta nula.** O `<user>` continua obrigatório no `GetUserResponse`. As alternativas (`minOccurs="0"`, `nillable="true"`) foram explicadas e descartadas.
- **Erros tipados:** `errors/`, um arquivo por classe, reexportados por `errors/index.ts`. Régua: **uma classe para cada tratamento diferente no adaptador**, não uma por mensagem. Hoje: `UserNotFoundError` (sem argumentos) e `UserValidateError(message)`. Os erros não carregam status: status é vocabulário do transporte.
- **Tradução de erros:** o tradutor tem uma tabela `classe → statusCode`, acha a entrada com `find` + `instanceof` e **devolve** `{ Fault: { faultcode: "soap:Client", faultstring: error.message, statusCode } }`; erro fora da tabela é devolvido intacto e sai como 500. Quem lança é o endpoint: `throw faultTranslator.translate(error)`.
- **Objeto de serviços:** o endpoint exporta o `IServices` completo (`{ UserService: { UserPort: { GetUser } } }`) e o `server.ts` o passa ao `soap.listen`.
- **`UserEntity`:** apagada em 01/10 por falta de uso. Classe com campos `protected` não serializa direto na resposta SOAP (a lib usa objeto simples).
- **Vários domínios (planejado):** um único `http.Server`/porta e **um `soap.listen` por domínio** (ex.: `/user`, `/product`), verificado que funciona. Com um segundo domínio, um registro `{ path, services, wsdl }` iterado pelo `server.ts`; o `XMLService` precisará receber o arquivo, hoje fixo em `users-data.xml`.
- **Imports:** grupos separados por linha em branco (módulos `node:` → libs → arquivos do projeto). Barrel só na pasta `errors/`. Aliases de caminho não recomendados por enquanto.

## Adiado ou em aberto

| Assunto | Situação |
|---|---|
| `<GetUserRequest/>` sem filhos: `args` chega `null` e o `args.id` estoura dentro do `try` (500 `TypeError` em vez de 400) | Adiado pelo usuário para a fase de testes |
| `parseInt` da lib: `3.9` devolve o usuário 3, `10.3` responde "não encontrado" (o usuário percebeu sozinho pelo Postman) | Adiado para os testes. Opções dadas: aceitar (recomendação do Claude: quem segue o contrato nunca manda `10.3`) ou `xsd:string` só no `id` da requisição, validando o texto cru no endpoint |
| Testes automatizados | Desejo do usuário; nada definido |
| Como a troca em tempo real é disparada (etapa 10) | Opções na seção "Fase 2" |
| `npm run build` / `npm start` | Não funcionam (ver "Scripts") |
| `package-lock.json` | Não existe (ver "Infra") |

## Fase 2: portas e adaptadores

### Objetivo (pedido do usuário em 04/10)

Aprender modularização: expor a mesma regra de negócio por **SOAP, REST, GraphQL e gRPC** e gravar em **memória, XML, JSON e arquivo de texto**, usando **interfaces** para isolar as camadas e **nomes que não dependam de protocolo**. A troca tem de ser **real e em tempo real**: o argumento do usuário é que arquitetura hexagonal sem nenhuma troca de fato é só custo.

### Já antecipado na Fase 1

- Erros tipados de domínio e tradução por adaptador (feito em 04/10).
- Porta do repositório e injeção de dependência (etapa 3b, a fazer).

### Vocabulário (explicado em 04/10)

Arquitetura hexagonal / portas e adaptadores (Cockburn, 2005; a Clean Architecture é uma variação). Service layer e Repository vêm do Fowler (PoEAA, 2002) e do DDD; controller vem do MVC.

| Termo | O que é | Equivalente hoje |
|---|---|---|
| Domínio | Entidades e regras puras, erros de domínio | `UserType`, `errors/`, a regra do `UserValidate` |
| Caso de uso | Uma ação do sistema (`GetUser`, `CreateUser`) | `UserService.getUser` |
| Porta | Interface definida pelo núcleo. De entrada: o que ele oferece. De saída: o que ele precisa (`UserRepository`) | `ports/` (vazia; etapa 3b) |
| Adaptador | Implementação concreta de fora. De entrada: SOAP, REST, GraphQL, gRPC. De saída: repositórios | `user-endpoint.ts`, `fault-translator.ts`, `UserRepository`, `XMLService` |
| Raiz de composição | Único lugar que conhece as classes concretas e liga tudo | `server.ts` (passa a ser de fato na etapa 3b) |

- **Regra de dependência:** só para dentro. O domínio não importa nada; casos de uso importam domínio e portas; adaptadores importam casos de uso. O caso de uso conhece a interface `UserRepository`, nunca o `XmlUserRepository`.
- Fora dos adaptadores, só nomes neutros. **Dentro** de cada adaptador, nomes nativos do protocolo: endpoint (SOAP), controller (REST), resolver (GraphQL), handler/servicer (gRPC). Por isso o usuário renomeou o controller para `user-endpoint.ts`.
- **O adaptador é acoplado ao protocolo de propósito.** Cada transporte terá o seu endpoint e o seu tradutor de erros; isolado fica o núcleo. Tabela mostrada ao usuário: `UserNotFoundError` vira Fault `soap:Client` (SOAP), 404 (REST), entrada em `errors` (GraphQL), `NOT_FOUND` (gRPC).
- **`types/` contra `ports/`** (distinção feita pelo próprio usuário): `types/` guarda formato de dado; `ports/` guarda contrato de comportamento.
- **Choques de nomes:** "service" (o `<service>` do WSDL contra a camada de regras; por isso "caso de uso") e "port" (a `<port>` do WSDL é um endereço concreto e fica escondida no adaptador SOAP; a porta hexagonal é uma interface).

### Estrutura proposta (por módulo, depois por camada)

```
src/
  main.ts                    raiz de composição: cria tudo e decide o que sobe
  shared/                    servidor HTTP, gravação atômica, erros-base
  user/
    domain/                  User, UserNotFoundError, UserValidateError
    application/             casos de uso + portas (interface UserRepository)
    adapters/
      persistence/{memory,xml,json,text}/
      soap/                  user.wsdl + endpoint + tradutor de Faults + tipos do envelope
      rest/
      graphql/               schema + resolvers
      grpc/                  user.proto + handlers
```

### Mudanças de código previstas

- **Sair do `static`:** interface em TS não descreve método estático, então `implements UserRepository` exige instâncias. Dependências entram pelo construtor (parameter properties estão liberadas no `tsconfig`).
- **Validação desce para o núcleo:** hoje cada adaptador teria de lembrar de chamar o `UserValidate`.
- **Cada protocolo com o seu contrato e os seus tipos** (WSDL, OpenAPI opcional, schema GraphQL, `.proto`); os tipos do envelope não vazam para dentro.
- **`id`:** cada protocolo entrega de um jeito (texto no caminho REST, `ID` no GraphQL, inteiro no gRPC); o caso de uso define o tipo (`number`) e cada adaptador converte.
- **Infra:** SOAP, REST e GraphQL podem dividir o mesmo `http.Server`; gRPC usa HTTP/2 (`@grpc/grpc-js`) e porta própria.

### Persistência (quatro formas, confirmado em 04/10)

Porta de saída `UserRepository` com `InMemoryUserRepository`, `XmlUserRepository`, `JsonUserRepository` e `TextUserRepository`.

- **Memória:** primeira a ser feita; trocar o XML por ela mexendo só na raiz de composição prova que a porta está certa.
- **JSON:** `JSON.parse` devolve `any`; com o `strict`, tratar como `unknown` e validar com *type guard*.
- **Texto:** o formato fica a critério do usuário (separador, escape do separador dentro dos dados ou proibição na validação, onde guardar o `nextId`). São os problemas do CSV.
- A gravação atômica (`.tmp` + `rename`) é igual nos formatos de arquivo: quando o usuário perceber a cópia, extrair para `shared/`.

### Troca em tempo real (etapa 10)

**Decidido:**

- Trocar persistência e transportes **sem reiniciar** a aplicação.
- **Variável de ambiente serve só para o estado inicial.** A ideia original do usuário (injetar variáveis no container em execução) **não funciona**, e foi demonstrado: um processo novo com outra variável (o que o `docker exec -e` faz) não altera o que já roda, e `/proc/<pid>/environ` é só leitura (`Permission denied`).
- **Dados na troca de persistência:** cada formato mantém os **seus próprios dados**, sem migração. Se o usuário se empolgar, evoluir para migração a quente.
- **Memória:** os dados **somem** ao sair dela (e ao reiniciar). Sem carga inicial por enquanto.

**A decidir no futuro (o usuário pediu para registrar e deixar para depois): como a troca é disparada.**

| Opção | Como | Ponto fraco |
|---|---|---|
| Rota de administração (recomendação do Claude) | Rota de admin no servidor, chamada por um script (`npm run switch -- persistence json`) | Precisa de proteção: só `localhost` ou porta própria |
| Arquivo de configuração observado | `fs.watch` num `config.json` | Não testado: no WSL2, edição feita no host pode não gerar evento no container |
| Sinal `SIGHUP` | Editar o arquivo e `docker kill -s HUP` (padrão do nginx) | Não testado: o PID 1 é o `npm`, que pode não repassar o sinal ao `node` |
| Serviço de configuração | Consul, etcd, *feature flags* | Infraestrutura demais; só referência do mercado |

**Desenho no código (explicado):**

- Persistência: `SwitchableUserRepository` implementa a porta e delega à implementação atual (padrão **Proxy**); os casos de uso recebem o proxy. Ao lado, um registro `nome → fábrica` (`"memory"`, `"xml"`, `"json"`, `"txt"`).
- Transportes não são exclusivos (vários no ar ao mesmo tempo): ligar e desligar, com interface de ciclo de vida `start()`/`stop()`. **Conferir** se a lib `soap` permite desligar um serviço registrado; se não, uma checagem na frente dele.
- Com código síncrono (as chamadas de `fs` atuais), uma troca nunca acontece no meio de uma requisição; se o código ficar assíncrono, rever.

## Estrutura atual (20h20 de 04/10; reler mesmo assim)

```
src/server.ts                       sobe o http, lê o WSDL (troca {{PORT}}) e chama soap.listen(server, "/user", UserWebService, wsdl)
src/users-data.xml                  "banco": <users nextId="4"> com 3 <user id> → <name>, <email>
src/user/user.wsdl                  contrato (só GetUser)
src/user/user-endpoint.ts           const UserWebService: IServices (UserService → UserPort → GetUser): valida, chama o service, traduz erro
src/user/fault-translator.ts        classe faultTranslator (static translate): erro de domínio → Fault 1.1, pela tabela classe → status
src/user/user-validate.ts           classe UserValidate (static): um método por operação; getUser valida o id
src/user/user-service.ts            classe UserService (static): getUser busca e lança UserNotFoundError
src/user/user-repository.ts         classe UserRepository (static): XPath sobre o Document → UserType | null
src/user/errors/                    index.ts (barrel), user-not-found-error.ts, user-validate-error.ts
src/user/ports/a.txt                marcador para versionar a pasta; a interface do repositório entra aqui
src/user/types/user-type.ts         interface UserType { id: number, name, email }
src/user/types/user-wsdl-types.ts   GetUserRequest / GetUserResponse (espelho do WSDL)
src/user/types/user-faults-type.ts  interface UserFaultsType { type: classe de erro, statusCode }
src/xml/xml-service.ts              classe XMLService (static): read(): Document, write(Document), selectElements(expr, ctx)
src/setup/docker/                   Dockerfile, Dockerfile.dockerignore, docker-compose.yml
src/setup/env/                      .env (não versionado), .env.example
.devcontainer/devcontainer.json
```

Ainda não existem: `src/client.ts` (etapa 5) e `public/index.html` (etapa 6).

- **Nomes:** arquivos e pastas em **kebab-case minúsculo**; classes em PascalCase. Linux diferencia a caixa, então conferir scripts, imports e `new URL(...)` a cada renomeação.
- Histórico de nomes, para reconhecer referências antigas: `user-controller.ts` → `user-endpoint.ts`; `user-dto.ts`/`UserDTO` → `user-validate.ts`/`UserValidate`; `user-fault-translator.ts`/`UserFaultTranslator` → `fault-translator.ts`/`faultTranslator`; `user-faults.ts` → `user-faults-type.ts`.
- Há um bloco de código comentado no fim de `user-repository.ts` (exemplos de criar, atualizar e remover nós no DOM, deixados por outro agente). O usuário pediu para **ignorá-lo**; vai servir de cola no `CreateUser`.

## Contrato SOAP

Tudo no **singular**:

- Namespace: `http://soap-estudos.local/user`. `soapAction`: `http://soap-estudos.local/user/GetUser`.
- `<service name="UserService">` → `<port name="UserPort">` → `<operation name="GetUser">`. `portType` `UserPortType`, `binding` `UserBinding`, mensagens `GetUserInput`/`GetUserOutput` com `part name="parameters"`.
- Tipos: `User` (`id` `xsd:int`, `name`, `email`), `GetUserRequest` (`id` `xsd:int`), `GetUserResponse` (`user` do tipo `tns:User`, obrigatório).
- `<soap:address location="http://localhost:{{PORT}}/user"/>`: o `server.ts` troca o marcador com `.replace('{{PORT}}', String(PORT))`. O arquivo sozinho não tem URL válida; se o marcador sumir, a troca falha em silêncio.
- O `soap.listen` e o `console.log` usam `/user`, igual ao `soap:address`. Os dois precisam concordar, inclusive na caixa (com `/users` no listen, `POST` manual respondia 200, mas um cliente criado a partir do `?wsdl` recebia 404).
- Namespace e `soapAction` são só identificadores, mas o cabeçalho `SOAPAction` enviado tem de ser idêntico ao do WSDL (com outro valor, Fault; vazio ou ausente, 200).

### Como a lib `soap` se comporta (tudo verificado)

**Objeto de serviços e roteamento**

- O objeto espelha o WSDL em três níveis, com os **mesmos nomes e caixa**: `{ UserService: { UserPort: { GetUser(args) {...} } } }`. Tipos: `IServices` → `IService` → `IServicePort`.
- Nome que não bate (serviço, porta, namespace ou caminho): a operação não é achada e o Fault diz `Cannot read properties of undefined (reading 'style')`.
- `soap.listen` pode ser chamado várias vezes no mesmo `http.Server`; requisições fora dos caminhos registrados caem no handler do `createServer` (404).
- O servidor não usa o `soap:address` para rotear (quem decide é o caminho do `soap.listen`); serve o WSDL exatamente como a string recebida. Quem usa o endereço é o cliente (`soap.createClient`).
- O namespace do elemento do `<Body>` não é conferido. `Content-Type` `text/xml`, `application/xml` (o padrão do Postman) e `text/plain` são aceitos.

**Entrada**

- Com `xsd:int`, a lib converte o texto com **`parseInt`** antes de chamar o handler: `2abc` → `2`, `1.5` → `1`, `1e2` → `1`, ` 2 ` → `2`, `007` → `7`, `2' or '1'='1` → `2`, `-1` → `-1`, `abc` → `NaN`. O código nunca vê o texto cru.
- Elemento vazio (`<id></id>`) → `args.id` é **`null`**. Requisição sem filhos (`<GetUserRequest/>`) → o próprio **`args` é `null`**.

**Saída**

- O retorno do handler é o conteúdo do `<GetUserResponse>`: `{ user: { id, name, email } }`. É serializado como texto, **sem validar contra o XSD**: o WSDL é a promessa, o handler é quem cumpre, e nada confere um contra o outro.
- Resposta fora do contrato (usuário devolvido sem o embrulho `user`): sai com 200, e o cliente `soap` lê `{ id: "2", ... }` com `res.user` indefinido e o `id` como texto. Dentro do contrato, o cliente lê `id` como `number`.
- Handler que devolve **`undefined`** não gera resposta: a conexão fica aberta até o cliente desistir.
- **Retorno nulo:** a serialização não depende do WSDL (igual com o contrato atual, com `minOccurs="0"` e com `nillable="true"`). `{ user: null }` → `<user xsi:nil="true"></user>`, e o cliente lê `{ user: { attributes: { "xsi:nil": "true" } } }` (não `null`). `{}` → `<GetUserResponse>` vazio, e o cliente lê `null` como resultado inteiro. `null` → `xsi:nil` no próprio `<GetUserResponse>`. Tudo com HTTP 200.

**Faults**

- `throw new Error("mensagem")` → HTTP 500 com `<soap:Code>…<soap:Reason><soap:Text>Error: mensagem</soap:Text>`: formato de Fault do SOAP 1.2 dentro de um envelope 1.1, código sempre `Server`, com o prefixo `Error: `.
- `throw { Fault: { faultcode: "soap:Client", faultstring } }` → formato 1.1 (`<faultcode>`/`<faultstring>`, sem prefixo), mas com **HTTP 200**.
- `statusCode` dentro do `Fault` define o HTTP (testado com 400, 404 e 500) e não aparece no XML. `detail: { userId: 99 }` vira `<detail><userId>99</userId></detail>`.
- Nos dois formatos o cliente `soap` rejeita a promise; o Fault fica em `error.root.Envelope.Body.Fault` e o status em `error.response.status`.

## Infra

Tudo roda em Docker; o usuário não instala nada no host (Windows + WSL2).

- **Imagem:** `node:24-alpine` + `bash` (`ENV SHELL=/bin/bash`), ESM (`"type": "module"`), usuário `node` (UID 1000 = UID do host, para arquivos criados no container não ficarem com dono root). Imagem de desenvolvimento (`CMD ["npm", "run", "dev"]`, `EXPOSE 8000`).
- **Local dos arquivos** (escolha do usuário, mantida): `src/setup/docker/` e `src/setup/env/`.
- **Compose:** caminhos relativos resolvidos a partir da **pasta do compose**: `build.context: ../../..` (raiz), `dockerfile: src/setup/docker/Dockerfile` (relativo ao contexto), `env_file: ../env/.env`, `ports: "${PORT:-8000}:${PORT:-8000}"`, volume `../../..:/app` + volume anônimo em `/app/node_modules`.
- **Comando** (da raiz, no host): `docker compose -f src/setup/docker/docker-compose.yml --env-file src/setup/env/.env up --build`. Deps novas: acrescentar `-V`.
- **`--env-file`:** alimenta o `${PORT:-8000}` do `ports`. O compose só lê sozinho um `.env` na pasta do projeto (aqui, a do compose), onde ele não está. Sem a flag, o mapeamento usa 8000; o container recebe a `PORT` de qualquer forma via `env_file`.
- **`.dockerignore`:** fica ao lado do Dockerfile com o nome `Dockerfile.dockerignore` (BuildKit), porque o contexto é a raiz. Exclui `node_modules`, `dist`, `.git` e `**/.env`.
- **`.gitignore`:** `node_modules/`, `dist/`, `src/setup/env/.env`. Padrões com `..` não funcionam em `.gitignore`.
- **`.env`:** `PORT=8000`, **sem espaços** ao redor do `=`. O código lê `Number(process.env['PORT']) || 8000` (colchetes por causa de `noPropertyAccessFromIndexSignature`).
- **Devcontainer:** aponta para `../src/setup/docker/docker-compose.yml`, serviço `app`, `overrideCommand: false` (o `npm run dev` continua rodando), `remoteUser: node`, `shutdownAction: none` (fechar o VS Code não derruba o container), extensões `anthropic.claude-code` e `redhat.vscode-xml`. O `node_modules` do host é vazio (só o ponto de montagem do volume), então o TS do editor só funciona dentro do container ("Dev Containers: Reopen in Container").
- **Container atual:** processo `tsx watch --include src/**/*.wsdl src/server.ts` com `PORT=8000`. A porta chega ao Windows: o usuário testa pelo **Postman** (POST em `http://localhost:8000/user`, Body → raw → XML). Em 04/10 ele disse não ter conseguido abrir um terminal no container; não se sabe se resolveu (`` Ctrl+` `` com a janela conectada ao Dev Container).
- **Git:** quem versiona é o usuário. No ambiente do Claude existe `.git`, mas não o binário.
- **Sem `package-lock.json`:** o `npm install` da imagem gera o lockfile dentro da imagem e o bind mount o esconde, então ele nunca chega ao repositório. Gerar se o usuário quiser (`npm install --package-lock-only`).
- **Ambiente do Claude:** o próprio container do usuário. Sem `docker`, `git`, `python` nem `curl`; `ls`, `cat` e afins são do BusyBox (sem `--time-style`). Para HTTP, `fetch` do Node.
  - O servidor do usuário já roda aqui: testar direto em `http://localhost:8000/user`.
  - Para experimentar algo sem tocar no código dele, subir um servidor temporário em outra porta (a 8123 foi usada) com um `.mjs` na raiz de `/app` (precisa do `node_modules` de lá) e apagar em seguida. Arquivo `.ts` temporário para o `tsc` enxergar vai dentro de `src/` e também é apagado.
  - **Não usar `pkill -f` com padrão que case com o próprio comando** (em 01/10 isso matou o shell do teste).
  - O diretório de rascunho da sessão pode não existir: criar com `mkdir -p` antes de usar.
- A memória automática do Claude é chaveada pelo caminho do projeto e não é compartilhada entre host e container: o contexto vem deste arquivo.

### TypeScript

- TypeScript 7 (`tsc`) só checa tipos e gera `dist/`. O **`tsx`** executa o `.ts` em dev **sem checar tipos**: erros de tipo só aparecem no `npm run typecheck`. Com erro de sintaxe em qualquer arquivo, o `tsc` mostra só os de sintaxe e esconde os de tipo.
- `tsconfig.json`: `target ES2023`, `strict` + `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`, `noUnused*`, `verbatimModuleSyntax`, `isolatedModules`, `forceConsistentCasingInFileNames`, `skipLibCheck`. `erasableSyntaxOnly` fica **desligado** de propósito (parameter properties e enums).
- Módulos `NodeNext`: imports relativos levam extensão **`.js`** mesmo o arquivo sendo `.ts`, e pasta não resolve sozinha: `./errors/index.js`, não `./errors` (o `tsc` acusa `TS2834`; o `tsx` aceita, o que esconde o erro em dev).
- `import type` é obrigatório para tipos (`import type { X }` ou `import type * as X`). Num import que também traz valores, `{ Valor, type Tipo }` está certo. `instanceof` precisa do import normal (a classe existe em execução).
- **Atrito de tipos:** `@xmldom/xmldom` e `xpath` não combinam. O cast (`context as Node`, resultado `as unknown as Element[]`) está encapsulado em `XMLService.selectElements`.

### Scripts

- `dev`: `tsx watch --include "src/**/*.wsdl" src/server.ts`. O `.wsdl` entra no watch explicitamente porque nenhum `.ts` o importa; o `users-data.xml` fica fora para a gravação no banco não reiniciar o servidor.
- `typecheck`: `tsc --noEmit`.
- `build` / `start` (`node dist/server.js`): **ainda não funcionam**, porque o `tsc` não copia `user.wsdl` nem `users-data.xml` para `dist/`. Falta um passo de cópia, com uma decisão embutida: copiar o banco para `dist/` faria cada build sobrescrever os dados gravados.
- `client`: `tsx src/client.ts` (arquivo ainda não existe).

### Caminhos de arquivo

Imports e `new URL('./arquivo', import.meta.url)` são relativos ao **arquivo que os escreve**, não à raiz do projeto. O `xml-service.ts` está em `src/xml/` e o banco em `src/`, então usa `'../users-data.xml'`. O `server.ts` está em `src/` e o contrato em `src/user/`, então usa `'./user/user.wsdl'`. Um arquivo em `src/user/types/` alcança os erros com `'../errors/index.js'`. Mexeu um arquivo de pasta, conferir o caminho. O `typecheck` pega import errado, mas **não** pega `new URL` errado: só a execução.

## Pendências menores (código do usuário, apontadas e abertas)

Nenhuma bloqueia; não repetir a cada revisão.

- `UserRepository`: o `id` devolvido vem do parâmetro, não do XML; `<user>` sem `<name>`/`<email>` devolve o mesmo `null` de "não encontrado".
- `user-wsdl-types.ts`: `GetUserRequest.id` é `number`, mas a lib entrega `number | null`, e `args` pode ser `null`. O tipo esconde do compilador o caso adiado do `args` nulo.
- `user-faults-type.ts`: usa `import * as` onde `import type * as` basta; e mora em `types/` embora só o adaptador SOAP o use (dito ao usuário; a decisão é dele).
- `XMLService.read`: o `if (documentElement === null)` não disparou em nenhum dos casos testados.
- `XMLService.write`: o `.tmp` resolve certo (`/app/src/users-data.xml.tmp`), mas o `import.meta.url` ali é redundante.
- `XMLService.selectElements`: `context: unknown` aceita qualquer coisa (uma string só falha em execução) e o resultado é tratado como `Element[]` mesmo quando a expressão devolve atributos (`//user/@id` devolve `Attr`).
- `server.ts`: o caminho `/user` está escrito duas vezes (listen e log); `readFileSync (` e `new URL (` com espaço.
- Sem formatador nem linter: aspas simples e duplas misturadas, `if(` sem espaço.
- `users-data.xml` ficou em `src/` (plural) enquanto o WSDL está em `src/user/` (singular).

## Notas de mentoria

### Linha do tempo

- **01/10** (um único dia, do zero): setup, WSDL, banco XML, `XMLService`, repositório, service, servidor subindo com um controller de teste. No fim do dia o usuário pediu uma avaliação. Pontos fortes: WSDL escrito à mão, a divisão em camadas por conclusão própria, a validação do `id` depois de entender injeção, correções rápidas. Pontos fracos: caminhos de arquivo depois de renomear ou mover e reorganizar antes de terminar a etapa.
- **04/10, primeira conversa:** arquitetura e planejamento da Fase 2 (vocabulário, hexagonal, quatro persistências, quatro transportes, troca em tempo real). Nenhum código mexido.
- **04/10, segunda conversa (das 16h às 20h20):** a etapa 3 foi fechada. Em ordem: `id` virou `number`; validação separada em classe própria; controller ligado ao service; bug do embrulho `{ user }`; teste pelo Postman; "não encontrado" como Fault com 404; classes de erro e barrel; controller renomeado para endpoint; tradutor de Faults (seis rodadas de revisão); decisão de antecipar a porta do repositório.

### Como o usuário aprende

- **Forte em arquitetura:** chega sozinho às perguntas certas (o Fault no controller acopla ao SOAP? interface de contrato é "type"? vale converter agora para não refazer cinco operações?). Vale responder com o princípio e deixá-lo decidir.
- **Tropeça na mecânica do TypeScript/JS:** escopo, sombreamento, casts, imports. Aqui a linha exata e um exemplo curto rendem mais do que o conceito.
- Decide rápido e com firmeza sobre nomes e estilo. Dar a opinião uma vez, registrar a escolha e seguir.
- Quando está em dúvida sobre como resolver algo secundário, prefere adiar ("vejo com mais calma nos testes"). Respeitar e registrar.

### Conceitos já explicados

- WSDL: namespaces (`tns`, `xsd`), `sequence`, a cadeia `service → binding → portType → message → element`; `minOccurs="0"` contra `nillable="true"` contra Fault.
- XML/DOM: `DOMParser` e `XMLSerializer` são inversos; um `Element` é um nó da árvore, não um "usuário"; `getAttribute` e `textContent` devolvem `string | null`; os espaços da indentação viram nós `#text`.
- Arquivo: gravação atômica (`.tmp` + `rename`); `rmSync(..., { force: true })`; `{ cause: error }`.
- XPath: sintaxe básica, comparação com DOM puro, injeção e a defesa por validação.
- SOAP: endereço único com `POST`; a operação vem do `SOAPAction` e do `<Body>`; hierarquia WSDL → service → port → operation; contract-first (o WSDL é a verdade e o tipo TS é o seu espelho; mudar o tipo para calar o compilador não conserta a resposta); Fault = `throw` no handler; os dois formatos de Fault, `faultcode` `Client` contra `Server`, e o HTTP 500 que a especificação 1.1 pede.
- Lib `soap`: os três níveis `IServices` → `IService` → `IServicePort`; o `soap:address` só serve aos clientes; namespace e `soapAction` são identificadores; o `parseInt` do `xsd:int`.
- JS/TS: `typeof NaN === "number"`, `isNaN` global contra `Number.isNaN`, `Number.isInteger`; `Number()` contra `parseInt`; `const x: Tipo = valor`; `import type`; `import * as X` (o `*` exige nome; só `export * from` dispensa); `typeof Namespace[keyof typeof Namespace]` para "qualquer classe exportada"; `never` contra devolver e lançar no `catch`; `some` (sim ou não) contra `find` (qual); escopo do parâmetro de uma arrow function e sombreamento; `as any` como a porta por onde o `strict` deixa passar erro; estreitamento com `instanceof Error` no lugar de cast; `throw` aceita qualquer valor.
- Erros: *rethrow* nas três formas (relançar igual, embrulhar com `cause`, traduzir para outro formato); `catch` que não relança engole o erro; só capturar quando há algo a acrescentar.
- Organização: DTO (carrega dados) contra validador (confere); grupos de imports; barrel; quando usar um arquivo com várias classes ou uma pasta com um arquivo por classe.
- Arquitetura: camadas; controller contra service; o adaptador é acoplado ao protocolo de propósito, isolado fica o núcleo; vocabulário hexagonal e regra de dependência; `types/` contra `ports/`; injeção de dependência e por que `static` não combina com interfaces; raiz de composição; erros tipados traduzidos por adaptador; padrão Proxy e registro de fábricas para a troca; ciclo de vida `start`/`stop`; o ambiente de um processo é imutável por fora (demonstrado); `JSON.parse` → `unknown` + type guard; problemas de formato de texto.

### Erros que o usuário cometeu (ficar atento à repetição)

- **Caminho errado depois de renomear ou mover.** O mais repetido. Confunde "relativo à raiz do projeto" com "relativo ao arquivo que escreve". Em 04/10: renomeou o controller sem atualizar o import do `server.ts` (servidor caiu) e escreveu `./errors/index.js` de dentro de `types/`.
- **Fazer metade de uma mudança de duas pontas:** criou `UserNotFoundError` e o `catch`, mas o service seguiu lançando `Error`; trocou o tradutor para devolver o valor, mas o endpoint não ganhou o `throw`. A mensagem igual nos dois lugares esconde o defeito.
- **Calar o compilador em vez de consertar:** trocou o tipo de retorno do handler para `UserType` em vez de embrulhar em `{ user }`; usou `as any` e `as Error` para ler campos que não existiam.
- **Escopo e nomes:** usou fora da arrow o parâmetro dela; deu ao parâmetro o nome da variável de fora; comparou com a entrada da tabela em vez de `entrada.type`.
- Caixa/número inconsistente entre WSDL e código (`Users` contra `users`; singular contra plural).
- Pôr `<message>`/`<portType>` dentro do `<xsd:schema>`.
- `catch` que descarta o erro original; `parseInt` na validação; `:` no lugar de `=` ao declarar um objeto tipado; `.env` com espaços e `.gitignore` com `..`.

### Erros do Claude a não repetir

- Afirmar sem testar: disse que o `soapAction` com caixa diferente era inofensivo, e o curl passado no chat falhava; depois disse, sem testar, que o glob `src/**/*.wsdl` alcançava subpastas (estava certo, mas a ordem estava errada). **Testar antes de afirmar.**
- Ler as datas do container (UTC) como se fossem do usuário: disse que o projeto levou dois dias quando foi um só. Converter para UTC-3.
- Empilhar notas datadas neste arquivo em vez de reescrever o trecho: em poucas horas a seção de estado ficou contraditória.
- Repetir a mesma dica em palavras rodada após rodada: quando não funcionou duas vezes, mostrar as linhas.
- Descrever a estrutura de memória: o bloco comentado estava anotado no arquivo errado até alguém reler. Conferir no disco.
