import UserRepository from './user-repository.js';
import type UserType from './types/user-type.js';

export default class UserService {
  public static getUser(id: string): UserType | null {
    if(typeof id !== "string")
      throw new Error("Tipo de identificador inválido");

    if(!id || id.trim() === "")
      throw new Error("Identificador não informado");

    if(id.length > 3)
      throw new Error("Identificador muito longo");

    if(!/^\d+$/.test(id))
      throw new Error("Identificador não é um número válido");

    const validId = Number(id);
    if(validId < 1)
      throw new Error("Identificador inválido");

    // manter conversão numérica para impedir casos como 007 em texto passar ao invés de 7
    const user: UserType | null =
      UserRepository.getUser(validId.toString());

    return user;
  };
};