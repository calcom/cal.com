export class CalendarAppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalendarAppError";
  }
}

export class CalendarAppDomainWideDelegationError extends CalendarAppError {
  constructor(message: string) {
    super(message);
    this.name = "CalendarAppDomainWideDelegationError";
  }
}

export class CalendarAppDomainWideDelegationConfigurationError extends CalendarAppDomainWideDelegationError {
  constructor(message: string) {
    super(message);
    this.name = "CalendarAppDomainWideDelegationConfigurationError";
  }
}

export class CalendarAppDomainWideDelegationInvalidGrantError extends CalendarAppDomainWideDelegationError {
  constructor(message: string) {
    super(message);
    this.name = "CalendarAppDomainWideDelegationInvalidGrantError";
  }
}

export class CalendarAppDomainWideDelegationClientIdNotAuthorizedError extends CalendarAppDomainWideDelegationConfigurationError {
  constructor(message: string) {
    super(message);
    this.name = "CalendarAppDomainWideDelegationClientIdNotAuthorizedError";
  }
}

export class CalendarAppDomainWideDelegationNotSetupError extends CalendarAppDomainWideDelegationConfigurationError {
  constructor(message: string) {
    super(message);
    this.name = "CalendarAppDomainWideDelegationNotSetupError";
  }
}
