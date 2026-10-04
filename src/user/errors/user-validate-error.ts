export default class UserValidateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserValidateError";
  }
}