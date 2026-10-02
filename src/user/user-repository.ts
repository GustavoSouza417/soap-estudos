import type { Document } from '@xmldom/xmldom';
import type UserType from './types/user-type.js';
import XMLService from '../xml/xml-service.js';

export default class UserRepository {
  public static getUser(id: string): UserType | null {
    const document: Document = XMLService.read();
    const [user]: Element[] =
      XMLService.selectElements(`//user[@id='${id}']`, document);

    const name: string | undefined = user?.getElementsByTagName('name')[0]?.textContent;
    const email: string | undefined = user?.getElementsByTagName('email')[0]?.textContent;

    if (!name || !email)
      return null;

    return {
      id: id,
      name: name,
      email: email
    };
  };
};



// // ---------- CRIAR ----------
// const nextId = Number(root.getAttribute('nextId'));
// const book = doc.createElement('book');
// book.setAttribute('id', String(nextId));
// const title = doc.createElement('title');
// title.appendChild(doc.createTextNode('Capitães da Areia'));     // texto vira nó filho
// book.appendChild(title);
// root.appendChild(book);
// root.setAttribute('nextId', String(nextId + 1));                // atualiza o contador

// // ---------- ATUALIZAR ----------
// const [t] = selectElements("//book[@id='1']/title", doc);
// if (t) t.textContent = 'Novo título';                           // troca o conteúdo

// // ---------- REMOVER ----------
// const [gone] = selectElements("//book[@id='2']", doc);
// gone?.parentNode?.removeChild(gone);                            // o pai remove o filho