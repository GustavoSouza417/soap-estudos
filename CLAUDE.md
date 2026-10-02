# soap-estudos

Projeto de estudo: criar e consumir uma API SOAP do zero. O README.md descreve o projeto para quem o usa; este arquivo guarda o contexto de trabalho.

## Modo de trabalho (IMPORTANTE)

- O usuário **nunca fez SOAP** e quer aprender **codando na mão**.
- Papel do Claude: **mentor**. Explicar conceitos, propor o próximo passo, dar esqueletos/dicas e revisar o código do usuário. **Não escrever as implementações por ele** sem que ele peça.
- Quando ele pede "exatamente como devo escrever", quer o código pronto **no chat**, não gravado no arquivo.
- **A infra e a documentação são do Claude:** pode editar `package.json`, Docker, `.env.example`, `.gitignore`, README e este arquivo. O código em `src/` (fora de `src/setup/`) é do usuário: revisar e apontar, não alterar.
- Para testar o código dele, usar arquivo temporário e apagar em seguida. Ele gosta de ver o comportamento verificado na prática.
- Idioma: português (pt-BR).
- Avançar uma operação por vez, de ponta a ponta, antes de adicionar a próxima.
- O usuário reorganiza o projeto com frequência (nomes, pastas, caixa). **Sempre reler a árvore de arquivos antes de revisar**; não confiar na estrutura descrita aqui.

## Decisões

- **Stack:** Node.js + **TypeScript (strict máximo, POO)** com a lib [`soap`](https://www.npmjs.com/package/soap) 1.13 (servidor e cliente). O usuário prefere TS por gostar de POO e tipagem: classes, interfaces e `import type`.
- **Contract-first:** o usuário escreve o WSDL na mão (WSDL 1.1, SOAP 1.1, estilo **document/literal**).
- **Domínio:** Usuário (CRUD: `CreateUser`, `GetUser`, `ListUsers`, `UpdateUser`, `DeleteUser`). Nomes em inglês (`User`, `name`, `email`), sem senha.
- **Persistência:** arquivo XML como banco (escolha do usuário, para praticar XML), com `@xmldom/xmldom` + `xpath`. É a mesma API DOM que o navegador usa com `DOMParser` (etapa 6).
- **Arquitetura em camadas** (conclusão do próprio usuário: o transporte é só a "ponte"): `server` (HTTP/SOAP) → `controller` (traduz SOAP ↔ chamadas; tipos do envelope) → `service` (regras e validação) → `repository` (XML → objeto) → `xml-service` (I/O do arquivo). Só `server` e `controller` conhecem SOAP.
- **Validação do `id`** fica no `UserService`: só dígitos (`/^\d+$/`), no máximo 3 caracteres (teto de 999 usuários, aceito pelo usuário), `>= 1`, normalizado com `Number()` antes de ir ao repositório. O repositório monta o XPath por interpolação, então essa validação é a defesa contra injeção de XPath; o usuário aceitou isso porque o repositório não é exposto na API.
- **`UserEntity`:** apagada pelo usuário em 2026-10-02 (estava sem uso). Se a validação do `CreateUser`/`UpdateUser` (etapa 4) pedir uma classe, recriar. Classe com campos `protected` não serializa direto na resposta SOAP (a lib usa objeto simples).
- **`id` é `string`** no `UserType`, no service e no repositório, e `xsd:int` no WSDL. A lib entrega `number | null` ao handler e o cliente `soap` lê `number` na resposta, então só as camadas de dentro usam texto. O plano era o controller converter com `String(args.id)`, mas isso transforma `null` em `"null"` (ver "Como a lib se comporta"). **Decisão em aberto, levantada na revisão de 2026-10-02:** (a) manter `xsd:int` e levar `number` até o service, ou (b) trocar o contrato para `xsd:string` para a validação por regex ver o texto cru. Esperar a escolha do usuário.
- **Objeto de serviços:** não há mais `services.ts`. O controller exporta o `IServices` completo (`{ UserService: { UserPort: { GetUser } } }`, escolha do usuário entre as duas opções explicadas) e o `server.ts` o passa direto ao `soap.listen`.
- **Escala (planejado):** um único `http.Server`/porta e **um `soap.listen` por domínio** (um caminho, um WSDL e um objeto de serviços cada, ex.: `/user`, `/product`). Verificado que dois `soap.listen` no mesmo servidor funcionam. Com um segundo domínio, criar um registro (lista de `{ path, services, wsdl }`) e o `server.ts` iterar sobre ele. O `XMLService` precisará receber o arquivo, hoje fixo em `users-data.xml`.
- **Front (etapa 6):** uma única página HTML, sem CSS, com `fetch` e envelopes montados à mão.

## Estrutura atual

```
src/server.ts                       sobe o http, lê o WSDL (troca {{PORT}}) e chama soap.listen(server, caminho, UserWebService, wsdl)
src/users-data.xml                  "banco": <users nextId> com <user id> → <name>, <email>
src/user/user.wsdl                  contrato
src/user/user-controller.ts         exporta UserWebService: IServices completo (UserService → UserPort → GetUser)
src/user/user-service.ts            classe UserService: validação e regras (getUser)
src/user/user-repository.ts         XPath sobre o Document → UserType | null
src/user/types/user-type.ts         interface UserType
src/user/types/user-wsdl-types.ts   GetUserRequest / GetUserResponse
src/xml/xml-service.ts              read(): Document, write(Document), selectElements(expr, ctx)
src/setup/docker/                   Dockerfile, Dockerfile.dockerignore, docker-compose.yml
src/setup/env/                      .env (não versionado), .env.example
.devcontainer/devcontainer.json
```

Ainda não existem: `src/client.ts` (etapa 5) e `public/index.html` (etapa 6).

- **Nomes:** arquivos e pastas em **kebab-case minúsculo**; classes em PascalCase. Já foi PascalCase; Linux diferencia a caixa (`server.ts` ≠ `Server.ts`), então conferir scripts, imports e `new URL(...)` a cada renomeação.
- Há um bloco de código comentado no fim de `xml-service.ts` (exemplos de sintaxe de outro agente). O usuário pediu para **ignorá-lo**. O que havia no `server.ts` foi removido por ele.

## Contrato SOAP

Estado em 2026-10-02 (o usuário passou tudo para o **singular**):

- Namespace: `http://soap-estudos.local/user`. `soapAction`: `http://soap-estudos.local/user/GetUser`, já alinhado ao namespace.
- `<service name="UserService">` → `<port name="UserPort">` → `<operation name="GetUser">`.
- `<soap:address location="http://localhost:{{PORT}}/user"/>`: o `server.ts` troca o marcador com `.replace('{{PORT}}', String(PORT))` (escolha do usuário). O arquivo sozinho não tem URL válida; se o marcador sumir, a troca falha em silêncio.
- **Resolvido em 2026-10-02:** o `soap.listen` e o `console.log` do `server.ts` passaram para `/user`, igual ao `soap:address`. (Antes estavam em `/users`: `POST` manual respondia 200, mas um cliente criado a partir do `?wsdl` recebia 404.)
- O usuário já alternou entre `Users`, `users` e `user`. O `soap:address` e o caminho do `soap.listen` precisam concordar, inclusive na caixa. Namespace e `soapAction` são só identificadores, mas o cabeçalho `SOAPAction` enviado tem de ser idêntico ao do WSDL (com outro valor, Fault; vazio ou ausente, 200).

### Como a lib `soap` se comporta (verificado)

- O objeto de serviços espelha o WSDL em três níveis, com os **mesmos nomes e caixa**: `{ UserService: { UserPort: { GetUser(args) {...} } } }`. Tipos: `IServices` → `IService` → `IServicePort`.
- Nome que não bate (serviço, porta, namespace ou caminho): a operação não é achada e o Fault diz `Cannot read properties of undefined (reading 'style')`.
- Com `xsd:int`, a lib converte o texto com **`parseInt`** antes de chamar o handler (testado em 2026-10-02): `2abc` → `2`, `1.5` → `1`, `1e2` → `1`, ` 2 ` → `2`, `007` → `7`, `2' or '1'='1` → `2`, `-1` → `-1`, `abc` → `NaN`. Ou seja, a validação por regex do `UserService` nunca vê o texto cru vindo do SOAP.
- Elemento vazio (`<id></id>`) → `args.id` é **`null`**. Requisição sem filhos (`<GetUserRequest/>`) → o próprio **`args` é `null`** (o handler que lê `args.id` sem checar gera Fault `TypeError: Cannot read properties of null`).
- O namespace do elemento do `<Body>` não é conferido: com o namespace antigo e sem `SOAPAction`, respondeu 200.
- O retorno do handler é o conteúdo do `<GetUserResponse>`: `{ user: { id, name, email } }`. O que for devolvido é serializado como texto, sem validar contra o XSD (`<id>NaN</id>` sai com HTTP 200). O cliente `soap` lê o `id` da resposta como `number`.
- Um `throw` vira HTTP 500 com `<soap:Fault><soap:Code>…</soap:Code><soap:Reason><soap:Text>Error: mensagem</soap:Text></soap:Reason></soap:Fault>`: é o formato de Fault do SOAP 1.2 dentro de um envelope 1.1, com o prefixo `Error: `. Para a etapa 4: lançar `{ Fault: { faultcode, faultstring } }` para o formato 1.1.
- `soap.listen` pode ser chamado várias vezes no mesmo `http.Server`; requisições fora dos caminhos registrados caem no handler do `createServer`.
- O servidor não usa o `soap:address` para rotear (quem decide é o caminho do `soap.listen`); ele serve o WSDL exatamente como a string recebida. Quem usa o endereço é o cliente (`soap.createClient`).

## Infra

Tudo roda em Docker; o usuário não instala nada no host.

- **Imagem:** `node:24-alpine` + `bash`, ESM (`"type": "module"`), usuário `node` (UID 1000 = UID do host). É uma imagem de desenvolvimento (CMD `npm run dev`).
- **Local dos arquivos** (escolha do usuário, mantida): `src/setup/docker/` e `src/setup/env/`.
- **Compose:** os caminhos relativos são resolvidos a partir da **pasta do compose**: `build.context: ../../..` (raiz), `dockerfile: src/setup/docker/Dockerfile` (relativo ao contexto), `env_file: ../env/.env`, volume `../../..:/app` + volume anônimo em `/app/node_modules`.
- **Comando** (da raiz, no host): `docker compose -f src/setup/docker/docker-compose.yml --env-file src/setup/env/.env up --build`. Deps novas: acrescentar `-V`.
- **`--env-file`:** alimenta o `${PORT:-8000}` do `ports`. O compose só lê sozinho um `.env` na pasta do projeto (aqui, a do compose), onde ele não está. Sem a flag, o mapeamento usa 8000; o container recebe a `PORT` de qualquer forma via `env_file`.
- **`.dockerignore`:** fica ao lado do Dockerfile com o nome `Dockerfile.dockerignore` (BuildKit), porque o contexto é a raiz. Exclui `**/.env`.
- **`.gitignore`:** `src/setup/env/.env`. Padrões com `..` não funcionam em `.gitignore`.
- **`.env`:** `PORT=8000`, **sem espaços** ao redor do `=`. O código lê `Number(process.env['PORT']) || 8000` (colchetes por causa de `noPropertyAccessFromIndexSignature`).
- **Devcontainer:** aponta para `../src/setup/docker/docker-compose.yml`, `overrideCommand: false`, usuário `node`. O `node_modules` do host é vazio (só o ponto de montagem do volume), então o TS do editor só funciona dentro do container ("Dev Containers: Reopen in Container").
- **Ambiente do Claude:** o ambiente do Claude é o próprio container, sem o comando `docker` (e sem `git`, `python` nem `curl`; o `cat` é o do BusyBox; para HTTP, usar `fetch` do Node).- **Container recriado** (visto na segunda sessão de 2026-10-02): o processo já é `tsx watch --include src/**/*.wsdl src/server.ts` e há `PORT=8000` no ambiente, ou seja, o compose em `src/setup/` e o `env_file` funcionam. Continua valendo pedir o `docker compose ... config` para conferir o mapeamento de portas, que daqui de dentro não dá para ver.
- **Sem `package-lock.json`:** o `npm install` da imagem gera o lockfile dentro da imagem e o bind mount o esconde, então ele nunca chega ao repositório. Apontado na revisão; gerar se o usuário quiser (`npm install --package-lock-only`).
- A memória do Claude é chaveada pelo caminho do projeto e não é compartilhada entre host e container: o contexto vem deste arquivo.

### TypeScript

- TypeScript 7 (`tsc`) só checa tipos e gera `dist/`. O **`tsx`** executa o `.ts` em dev **sem checar tipos**: erros de tipo só aparecem no `npm run typecheck`. Com erro de sintaxe em qualquer arquivo, o `tsc` mostra só os de sintaxe e esconde os de tipo.
- `tsconfig.json`: `strict` + `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`, `noPropertyAccessFromIndexSignature`, `noUnused*`, `verbatimModuleSyntax`, `isolatedModules`. `erasableSyntaxOnly` fica **desligado** de propósito (parameter properties e enums).
- Módulos `NodeNext`: imports relativos levam extensão **`.js`** mesmo o arquivo sendo `.ts`. `import type` é obrigatório para tipos (`import type { X }` ou `import type * as X`).
- **Atrito de tipos:** `@xmldom/xmldom` e `xpath` não combinam. O cast (`context as Node`, resultado `as unknown as Element[]`) está encapsulado em `XMLService.selectElements`.

### Scripts

- `dev`: `tsx watch --include "src/**/*.wsdl" src/server.ts`. O `.wsdl` entra no watch explicitamente porque nenhum `.ts` o importa; o `users-data.xml` fica fora para a gravação no banco não reiniciar o servidor. Testado em 2026-10-02, em pasta isolada: esse padrão reinicia ao editar um `.wsdl` em subpasta (`src/user/user.wsdl`); o padrão antigo `wsdl/**` e a ausência de `--include` não reiniciam.
- `typecheck`: `tsc --noEmit`.
- `build` / `start` (`node dist/server.js`): **ainda não funcionam**, porque o `tsc` não copia `user.wsdl` nem `users-data.xml` para `dist/`. Falta um passo de cópia. Há uma decisão embutida: copiar o banco para `dist/` faria cada build sobrescrever os dados gravados.
- `client`: `tsx src/client.ts` (arquivo ainda não existe).

### Caminhos de arquivo

`new URL('./arquivo', import.meta.url)` é relativo ao **arquivo que o escreve**. O `xml-service.ts` está em `src/xml/` e o banco em `src/`, então usa `'../users-data.xml'`. O `server.ts` está em `src/` e o contrato em `src/user/`, então deve usar `'./user/user.wsdl'`. Mexeu um arquivo de pasta, conferir o caminho. O `typecheck` não pega caminho errado: só a execução.

## Roteiro / progresso

- [x] 0. Setup (Docker + package.json, feitos pelo Claude)
- [x] 1. WSDL com `GetUser`
- [x] 2. Banco XML + `XMLService` (read/write/selectElements, erros com `cause`, `.tmp` removido em falha) + `UserRepository.getUser` (`UserType | null`) + `UserService.getUser` (validação testada com cerca de 35 entradas hostis)
- [ ] 3. Servidor com `GetUser` + teste via `curl`. **Em andamento.** Em 2026-10-02 o servidor **sobe** (caminho do WSDL corrigido para `./user/user.wsdl`; `?wsdl` e `POST` em `/user` respondem 200 na porta 8000). O usuário **adiou a decisão do `id`** de propósito; não insistir. Falta:
  - `user-controller.ts`: hoje é um stub que devolve John Doe com `id: String(args.id)`. Falta chamar o `UserService`, tratar o `null` do "não encontrado" e proteger contra `args`/`args.id` nulos. Depende da decisão do `id` (ver Decisões).
  - Testar com o curl do README (já atualizado para o singular).
  - Verificado pelo Claude com um controller temporário ligado às camadas reais do usuário: id 2 devolve Jane Smith; 99, `abc`, `0`, `1000` e vazio viram Fault.
- [ ] 4. Demais operações (WSDL → servidor → curl, uma por vez), incluindo SOAP Faults
- [ ] 5. Cliente Node (`src/client.ts`)
- [ ] 6. Página HTML (servida pelo próprio servidor, para evitar CORS)

### Pendências menores apontadas e ainda abertas

- `UserRepository`: o `id` devolvido vem do parâmetro, não do XML; e `<user>` sem `<name>`/`<email>` devolve o mesmo `null` de "não encontrado".
- `UserService`: o primeiro `if` (`typeof id !== "string"`) nunca dispara para o TS, só em tempo de execução.

Acrescentadas na revisão de 2026-10-02 (todas verificadas na prática):

- `XMLService.read`: **corrigido** (o `parseFromString` ganhou `try` próprio com `cause`). O `if (documentElement === null)` continua lá e não disparou em nenhum dos casos testados.
- `XMLService.write`: o `.tmp` agora é `new URL(this.FILE_PATH + ".tmp", import.meta.url)` e resolve certo (`/app/src/users-data.xml.tmp`, verificado). A base é ignorada porque o primeiro argumento já é uma URL absoluta; é só redundante. O `write` em si ainda não foi exercitado (nada o chama).
- `XMLService.selectElements`: `context: unknown` aceita qualquer coisa (uma string só falha em execução) e o resultado é tratado como `Element[]` mesmo quando a expressão devolve atributos (`//user/@id` devolve `Attr`).
- `UserService`: o teste de tamanho vem antes do de dígitos, então `2abc` responde "muito longo"; `const validId` é a única declaração sem anotação de tipo.
- `user-controller.ts` e `user-repository.ts`: imports **corrigidos** (`import type { IServices }`, alias `UserWsdlTypes`, `import type { Document }`). O `xml-service.ts` ainda usa `{ DOMParser, type Document, XMLSerializer }`, o que ali está certo, pois há valores no mesmo import.
- `user-wsdl-types.ts`: `GetUserRequest.id` é `number`, mas a lib entrega `number | null` (e `args` pode ser `null`); o tipo promete mais do que o runtime cumpre.
- `server.ts`: o caminho `/user` está escrito duas vezes (listen e log); `readFileSync (` e `new URL (` com espaço.
- Sem formatador nem linter: aspas simples e duplas misturadas, `readFileSync (` com espaço, `if(` sem espaço.
- `users-data.xml` ficou em `src/` (plural) enquanto o WSDL foi para `src/user/` (singular).

## Notas de mentoria

**Fuso:** o relógio do container é UTC e o usuário está em UTC-3. As datas deste arquivo foram anotadas em UTC: tudo o que aparece como "2026-10-02" aconteceu na noite de **01/10/2026** no horário dele. O projeto inteiro até aqui foi feito em **um único dia** (01/10). Ao falar de datas com o usuário, converter para o horário local.

Datas: 2026-10-01, salvo indicação. Em 2026-10-02 (UTC): explicação dos três níveis do objeto de serviços, do `soap:address` e do marcador `{{PORT}}`, e a revisão geral do projeto.

**Conceitos já explicados**

- WSDL: namespaces (`tns`, `xsd`), `sequence`, a cadeia `service → binding → portType → message → element`.
- XML/DOM: `DOMParser` e `XMLSerializer` são inversos; um `Element` é um nó da árvore, não um "usuário"; `getAttribute` e `textContent` devolvem `string | null`, e o objeto é montado campo a campo; os espaços da indentação viram nós `#text`.
- Arquivo: gravação atômica (`.tmp` + `rename`, que *move* o arquivo, então o `.tmp` só sobra em falha); `rmSync(..., { force: true })`; `{ cause: error }`.
- XPath: sintaxe básica, comparação com DOM puro, injeção e a defesa por validação.
- JS/TS: `Number()` contra `parseInt`; regex `^\d+$`; `export default const` não existe; `const x: Tipo = valor` (o `:` é tipo, o `=` é valor); `import type`.
- SOAP: endereço único com `POST`; a operação vem do `SOAPAction` e do `<Body>`; diferença para o "endpoint" do REST; hierarquia WSDL → service → port → operation; Fault; um `soap.listen` por serviço.
- Lib `soap`: os três níveis `IServices` → `IService` → `IServicePort` e por que o TS acusa o erro na chamada do `soap.listen` (onde os dois formatos se encontram), não na declaração; o `soap:address` só serve aos clientes; namespace e `soapAction` são identificadores, não URLs de verdade; marcador `{{PORT}}` trocado com `replace` (e por que um marcador delimitado).
- Arquitetura: camadas, controller contra service, quando uma entidade (classe) se justifica.

**Erros que o usuário cometeu (ficar atento à repetição)**

- Pôr `<message>`/`<portType>` dentro do `<xsd:schema>`.
- Caminho de arquivo errado depois de renomear ou mover (caixa, pasta), em `new URL(...)`, scripts e compose. Aconteceu várias vezes.
- `catch` que descarta o erro original.
- `parseInt` na validação (`parseInt("9' or '1'='1")` é 9).
- `:` no lugar de `=` ao declarar um objeto tipado.
- `.env` com espaços e `.gitignore` com `..`.
- Caixa inconsistente no WSDL (`Users` contra `users`).
- 2026-10-02: renomeou e moveu o WSDL (`src/users.wsdl` → `src/user/user.wsdl`) e editou o `server.ts` depois disso sem atualizar o `new URL(...)`; passou o WSDL para o singular e deixou o `soap.listen` no plural. O `typecheck` passava mesmo assim, porque ele não confere caminhos de arquivo nem o conteúdo do WSDL. Na correção, trocou por `./src/user/user.wsdl` (pensando a partir da raiz, não da pasta do arquivo) e montou o `.tmp` do `XMLService` concatenando uma `URL` como texto. Padrão: confunde "relativo à raiz do projeto" com "relativo ao arquivo que escreve".

**Erro do Claude a não repetir:** afirmei que o `soapAction` com caixa diferente era inofensivo sem testar, e o curl que passei no chat (com `users`) falha contra o WSDL atual. Testar antes de afirmar. Em 2026-10-02 repeti o deslize ao dizer, sem testar, que o glob `src/**/*.wsdl` alcançava subpastas; o teste posterior confirmou, mas a ordem estava errada.
