import http from 'node:http';
import { readFileSync } from 'node:fs';
import * as soap from 'soap';
import UserWebService from './user/user-endpoint.js';

const PORT: number = Number(process.env['PORT']) || 8000;

const wsdlUserWebService: string = readFileSync (
  new URL ('./user/user.wsdl', import.meta.url), 'utf-8')
    .replace('{{PORT}}', String(PORT));

const server: http.Server <
  typeof http.IncomingMessage,
  typeof http.ServerResponse
> = http.createServer((_req, res) => {
  res.statusCode = 404;
  res.end('404: Not Found');
});

server.listen(PORT, () => {
  soap.listen (
    server,
    "/user",
    UserWebService,
    wsdlUserWebService
  );

  console.log(`Servidor SOAP rodando em http://localhost:${PORT}/user`);
});