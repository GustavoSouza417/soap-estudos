import { UserValidateError } from "./errors/index.js";

export default class UserValidate {
  public static getUser(id: number): void {
    if(Number.isInteger(id) === false)
      throw new UserValidateError("Tipo de identificador inválido");

    if(id > 999 || id < 1)
      throw new UserValidateError("Identificador fora do intervalo permitido");
  }
}