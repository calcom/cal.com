export class CalendarAppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalendarAppError";
  }
}

export class CalendarAppDelegationCredentialError extends CalendarAppError {
  constructor(message: string) {
    super(message);
    this.name = "CalendarAppDelegationCredentialError";
  }
}

export class CalendarAppDelegationCredentialConfigurationError extends CalendarAppDelegationCredentialError {
  constructor(message: string) {
    super(message);
    this.name = "CalendarAppDelegationCredentialConfigurationError";
  }
}

export class CalendarAppDelegationCredentialInvalidGrantError extends CalendarAppDelegationCredentialError {
  constructor(message: string) {
    super(message);
    this.name = "CalendarAppDelegationCredentialInvalidGrantError";
  }
}

export class CalendarAppDelegationCredentialClientIdNotAuthorizedError extends CalendarAppDelegationCredentialConfigurationError {
  constructor(message: string) {
    super(message);
    this.name = "CalendarAppDelegationCredentialClientIdNotAuthorizedError";
  }
}

export class CalendarAppDelegationCredentialNotSetupError extends CalendarAppDelegationCredentialConfigurationError {
  constructor(message: string) {
    super(message);
    this.name = "CalendarAppDelegationCredentialNotSetupError";
  }
}
