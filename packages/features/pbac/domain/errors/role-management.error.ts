export class RoleManagementError extends Error {
  constructor(
    message: string,
    public readonly code: RoleManagementErrorCode
  ) {
    super(message);
    this.name = "RoleManagementError";
  }
}

export enum RoleManagementErrorCode {
  UNAUTHORIZED = "UNAUTHORIZED",
  ROLE_NOT_FOUND = "ROLE_NOT_FOUND",
  INVALID_ROLE = "INVALID_ROLE",
}
