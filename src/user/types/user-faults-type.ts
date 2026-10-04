import * as UserErrors from "../errors/index.js";

export default interface UserFaultsType {
  type: typeof UserErrors[keyof typeof UserErrors];
  statusCode: number;
}