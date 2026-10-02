FROM node:24-alpine

WORKDIR /app
RUN chown node:node /app

# O Alpine só traz o sh do BusyBox; o Claude Code (e o terminal do editor) precisam de bash.
RUN apk add --no-cache bash
ENV SHELL=/bin/bash

# Roda como o usuário "node" (UID 1000), o mesmo do host:
# arquivos criados pelo container (ex.: src/users-data.xml) não ficam com dono root.
USER node

COPY --chown=node:node package*.json ./
RUN npm install

COPY --chown=node:node . .

EXPOSE 8000
# Imagem de desenvolvimento: tsx watch, reinicia ao editar os .ts ou o .wsdl em src/
CMD ["npm", "run", "dev"]
