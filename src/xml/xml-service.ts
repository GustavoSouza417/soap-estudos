import { readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { DOMParser, type Document, XMLSerializer } from '@xmldom/xmldom';
import xpath from 'xpath';

export default class XMLService {
  private static readonly FILE_PATH: URL = new URL("../users-data.xml", import.meta.url);
  
  public static read(): Document {
    let fileContent: string;
    let document: Document;

    try {
      fileContent = readFileSync(this.FILE_PATH, 'utf-8');
    } catch (error: unknown) {
      throw new Error("Erro ao ler o arquivo XML", { cause: error });
    };

    try {
      document = new DOMParser().parseFromString(fileContent, 'text/xml');
    } catch (error: unknown) {
      throw new Error("Erro ao parsear o arquivo XML", { cause: error });
    }
    
    if (document.documentElement === null)
      throw new Error("Não foi possível encontrar o elemento raiz no arquivo XML");
    
    return document;
  };

  public static write(data: Document): void {
    let fileContent: string;
    const TMP_FILE_PATH: URL = new URL (this.FILE_PATH + ".tmp", import.meta.url);

    try {
      fileContent = new XMLSerializer().serializeToString(data);
    } catch (error: unknown) {
      throw new Error("Erro ao serializar o documento XML", { cause: error });
    };
    
    try {
      writeFileSync(TMP_FILE_PATH, fileContent, 'utf-8');
      renameSync(TMP_FILE_PATH, this.FILE_PATH);
    } catch (error: unknown) {
      rmSync(TMP_FILE_PATH, { force: true });
      throw new Error("Erro ao escrever no arquivo XML", { cause: error });
    };
  };

  public static selectElements(expr: string, context: unknown): Element[] {
    const result: xpath.SelectReturnType = xpath.select(expr, context as Node);
    return Array.isArray(result) ? (result as unknown as Element[]) : [];
  };
};