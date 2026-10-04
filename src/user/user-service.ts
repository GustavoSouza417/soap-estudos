import UserRepository from './user-repository.js';

import type UserType from './types/user-type.js';
import { UserNotFoundError } from './errors/index.js';

export default class UserService {
  public static getUser(id: number): UserType {
    const user: UserType | null =
      UserRepository.getUser(id);

    if(!user)
      throw new UserNotFoundError();

    return user;
  }
}