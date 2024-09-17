export class CalendarAppConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalendarAppConfigurationError";
  }
}

export class CalendarAppConfigurationClientIdNotAuthorizedError extends CalendarAppConfigurationError {
  constructor(message: string) {
    super(message);
    this.name = "CalendarAppConfigurationClientIdNotAuthorizedError";
  }
}
