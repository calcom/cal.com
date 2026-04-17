import type { ValidatorConstraintInterface } from "class-validator";
import { ValidatorConstraint } from "class-validator";

@ValidatorConstraint({ name: "timezoneValidator", async: false })
export class TimeZoneValidator implements ValidatorConstraintInterface {
  validate(timeZone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone });
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    return "Please include a valid time zone";
  }
}
