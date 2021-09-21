import { IdentityServiceErrorCode } from "./IdentityServiceErrorCode";

export class IdentityServiceException extends Error {
  private readonly errorCode: IdentityServiceErrorCode;

  public constructor(errorCode: IdentityServiceErrorCode) {
    super(`Invalid input. Error code = ${errorCode}.`);
    this.errorCode = errorCode;
  }

  public getErrorCode(): IdentityServiceErrorCode {
    return this.errorCode;
  }
}
