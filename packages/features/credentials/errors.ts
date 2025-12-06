export class CredentialNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialNotFoundError";
  }
}

export class CredentialAccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialAccessDeniedError";
  }
}
