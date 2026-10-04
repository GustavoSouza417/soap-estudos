import type UserFaultsType from './types/user-faults-type.js';
import * as UserErrors from './errors/index.js';

export default class faultTranslator {
  public static translate(error: unknown): unknown {
    const faults: UserFaultsType[] = [
      { type: UserErrors.UserNotFoundError, statusCode: 404 },
      { type: UserErrors.UserValidateError, statusCode: 400 }
    ];
    
    const fault: UserFaultsType | undefined =
      faults.find((fault) => error instanceof fault.type);

    if(fault && error instanceof Error) {
      return {
        Fault: {
          faultcode: "soap:Client",
          faultstring: error.message,
          statusCode: fault.statusCode
        }
      }
    }

    return error;
  }
}