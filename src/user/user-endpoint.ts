import type { IServices } from 'soap';

import faultTranslator from './fault-translator.js';
import UserService from './user-service.js';
import UserValidate from './user-validate.js';

import type * as UserWsdlTypes from './types/user-wsdl-types.js';

const UserWebService: IServices = {
  UserService: {
    UserPort: {
      GetUser(args: UserWsdlTypes.GetUserRequest): UserWsdlTypes.GetUserResponse {
        try {
          UserValidate.getUser(args.id);

          const user: UserWsdlTypes.GetUserResponse = {
            user: UserService.getUser(args.id)
          };

          return user;
        } catch(error: unknown) {
          throw faultTranslator.translate(error);
        }
      },
    }
  }
}

export default UserWebService;