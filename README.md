# soap-estudos

Projeto de estudo: uma API SOAP escrita do zero (WSDL à mão), com Node.js + TypeScript, usando um arquivo XML como banco de dados. Tudo roda em Docker.

- **Contrato:** WSDL 1.1, SOAP 1.1, estilo document/literal, escrito à mão (contract-first).
- **Domínio:** usuários (`id`, `name`, `email`).
- **Estado:** em construção. A operação `GetUser` funciona de ponta a ponta, com erros devolvidos como SOAP Fault; as demais ainda não existem. Veja [Progresso](#progresso).

## Arquitetura

Cada camada só conhece a de baixo. Só as duas primeiras sabem que SOAP existe.

```
server.ts            HTTP + soap.listen (transporte)
  └─ endpoint        traduz o envelope SOAP em chamadas e a resposta de volta; valida a entrada
       └─ service    regras
            └─ repository   XML → objeto
                 └─ xml-service   leitura/gravação do arquivo e XPath
```

Erros seguem o caminho inverso: a validação e o service lançam erros de domínio (`errors/`), que não sabem nada de SOAP, e o endpoint os entrega ao `fault-translator`, que os converte em SOAP Fault. Um erro que o tradutor não conhece passa intacto e sai como falha do servidor.

## Estrutura

```
src/
  server.ts                      sobe o servidor HTTP, lê o WSDL e registra o SOAP
  users-data.xml                 "banco de dados" (<users nextId> com <user id>)
  user/
    user.wsdl                    contrato do serviço de usuários
    user-endpoint.ts             objeto de serviços do WSDL: UserService → UserPort → operações
    fault-translator.ts          traduz erros de domínio em SOAP Fault (tabela erro → status HTTP)
    user-validate.ts             validação da entrada (id inteiro, de 1 a 999)
    errors/                      erros de domínio (um arquivo por classe, reexportados pelo index.ts)
    user-service.ts              regras (usuário não encontrado vira erro)
    user-repository.ts           busca no XML e monta o UserType
    ports/                       interfaces que o núcleo exige de fora (em construção)
    types/
      user-type.ts               interface UserType
      user-wsdl-types.ts         formato das mensagens (GetUserRequest/Response)
      user-faults-type.ts        entrada da tabela do tradutor de Faults
  xml/
    xml-service.ts               read/write (gravação atômica) e selectElements (XPath)
  setup/
    docker/                      Dockerfile, Dockerfile.dockerignore, docker-compose.yml
    env/                         .env (não versionado) e .env.example
.devcontainer/                   abre o editor dentro do container
```

Convenções: arquivos e pastas em kebab-case minúsculo, classes em PascalCase, imports relativos com extensão `.js`, `import type` para tipos.

## Como rodar

Pré-requisito: Docker. Nada é instalado no host.

**1. Crie o `.env`:**

```bash
cp src/setup/env/.env.example src/setup/env/.env
```

**2. Suba o servidor** (da raiz do projeto):

```bash
docker compose -f src/setup/docker/docker-compose.yml --env-file src/setup/env/.env up --build
```

O servidor reinicia sozinho ao editar os `.ts` ou o `.wsdl`. Gravar no `users-data.xml` não reinicia.

**3. Outros comandos:**

```bash
# Derrubar
docker compose -f src/setup/docker/docker-compose.yml down

# Depois de mudar dependências no package.json (recria o volume do node_modules)
docker compose -f src/setup/docker/docker-compose.yml --env-file src/setup/env/.env up --build -V
```

Dentro do container (terminal do Dev Container, ou `docker compose -f ... exec app <comando>`):

```bash
npm run typecheck   # checa os tipos; o servidor de desenvolvimento NÃO checa
npm run dev         # o que o container já executa
```

### Editor (VS Code)

O `node_modules` só existe dentro do container. Para o editor enxergar os tipos, abra o projeto dentro dele: `F1` → **Dev Containers: Reopen in Container**.

## Configuração

| Variável | Padrão | Onde |
|---|---|---|
| `PORT` | `8000` | `src/setup/env/.env` |

- Escreva `PORT=8000`, sem espaços ao redor do `=`.
- O compose injeta o `.env` no container (`env_file`). O `--env-file` do comando serve para o mapeamento da porta; sem ele, o mapeamento usa 8000.
- O `.env` está no `.gitignore` e fica fora da imagem. Versione só o `.env.example`.
- O `<soap:address>` do `user.wsdl` traz o marcador `{{PORT}}`, que o `server.ts` troca pela `PORT` ao ler o arquivo. Por isso o arquivo, sozinho, não tem um endereço válido: o WSDL completo é o servido em `?wsdl`.

## API

| | |
|---|---|
| Endereço do serviço | `http://localhost:8000/user` |
| WSDL | `http://localhost:8000/user?wsdl` |
| Namespace | `http://soap-estudos.local/user` |
| Serviço / porta | `UserService` / `UserPort` |

Em SOAP, todas as operações usam o mesmo endereço, sempre com `POST`. A operação é identificada pelo cabeçalho `SOAPAction` e pelo elemento dentro do `<Body>`.

### Operações

| Operação | Entrada | Saída | `SOAPAction` |
|---|---|---|---|
| `GetUser` | `GetUserRequest` (`id`: int) | `GetUserResponse` (`user`: `id`, `name`, `email`) | `http://soap-estudos.local/user/GetUser` |

O `SOAPAction` precisa ser **idêntico** ao `soapAction` do WSDL, letra por letra; com outro valor o servidor devolve um Fault. Omitir o cabeçalho também funciona.

### Exemplo

```bash
curl -s -X POST http://localhost:8000/user \
  -H 'Content-Type: text/xml; charset=utf-8' \
  -H 'SOAPAction: "http://soap-estudos.local/user/GetUser"' \
  -d '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                        xmlns:tns="http://soap-estudos.local/user">
        <soapenv:Body>
          <tns:GetUserRequest>
            <tns:id>2</tns:id>
          </tns:GetUserRequest>
        </soapenv:Body>
      </soapenv:Envelope>'
```

Resposta (vem em uma linha só; indentada aqui para leitura):

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://soap-estudos.local/user">
  <soap:Body>
    <GetUserResponse xmlns="http://soap-estudos.local/user">
      <user>
        <id>2</id>
        <name>Jane Smith</name>
        <email>jane.smith@example.com</email>
      </user>
    </GetUserResponse>
  </soap:Body>
</soap:Envelope>
```

Erros voltam como `soap:Fault` com `faultcode` `soap:Client` e a mensagem em `<faultstring>`:

| Situação | HTTP |
|---|---|
| `id` inválido (não inteiro ou fora de 1 a 999) | 400 |
| Usuário inexistente | 404 |
| Erro inesperado do servidor | 500 |

### Regras do `id`

Validadas no `UserValidate`: número inteiro, de 1 a 999. Zeros à esquerda são aceitos (`007` é o usuário 7).

O contrato declara o `id` como `xsd:int`, então a lib `soap` converte o texto em número antes de ele chegar ao código, e lê só o começo numérico: `2abc` chega como `2` e `1.5` como `1`.

## Progresso

- [x] Infra (Docker, TypeScript)
- [x] WSDL com `GetUser`
- [x] Banco XML, `XMLService`, `UserRepository.getUser`, `UserService.getUser`
- [x] Servidor SOAP respondendo `GetUser`, com erros tipados traduzidos em Fault
- [ ] Interface do repositório (porta) e injeção de dependência
- [ ] Demais operações: `CreateUser`, `ListUsers`, `UpdateUser`, `DeleteUser`, com SOAP Faults
- [ ] Cliente Node (`src/client.ts`)
- [ ] Página HTML consumindo o serviço

Depois (planejado), em ordem:

- [ ] Separar a regra de negócio em portas e adaptadores (arquitetura hexagonal)
- [ ] Persistência em memória, XML, JSON e arquivo de texto
- [ ] Transportes REST, GraphQL e gRPC, além do SOAP
- [ ] Trocar persistência e transportes em tempo real, sem reiniciar a aplicação

## Limitações conhecidas

- Uma requisição `<GetUserRequest/>` sem o `<id>` devolve um Fault com mensagem de erro interno (`TypeError`), não uma mensagem de validação.
- `npm run build` / `npm start` ainda não funcionam: o `tsc` não copia `user.wsdl` nem `users-data.xml` para `dist/`.
- O `XMLService` está preso ao `users-data.xml`; para um segundo domínio ele precisará receber o arquivo.
- Não há `package-lock.json`: as versões das dependências podem variar entre instalações.
