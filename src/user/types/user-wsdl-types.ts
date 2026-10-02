import type UserType from './user-type.js';

interface GetUserRequest {
  id: number;
};
interface GetUserResponse {
  user: UserType;
};

export type { 
  GetUserRequest, GetUserResponse
};