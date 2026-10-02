import type { IServices } from 'soap';
import type * as UserWsdlTypes from './types/user-wsdl-types.js';

const UserWebService: IServices = {
  UserService: {
    UserPort: {
      GetUser(args: UserWsdlTypes.GetUserRequest): UserWsdlTypes.GetUserResponse {
        console.log("Usuário de teste temporário para retorno");
        return {
          user: {
            id: String(args.id),
            name: "John Doe",
            email: "john.doe@example.com"
          }
        };
      },
    },
  },
};

export default UserWebService;