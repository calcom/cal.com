import type { ValidatorConstraintInterface } from "class-validator";
import { ValidatorConstraint } from "class-validator";

@ValidatorConstraint({ name: "timeFormatValidator", async: false })
export class TimeFormatValidator implements ValidatorConstraintInterface {
  validate(timeFormat: number) {
    const timeFormatValues = [12, 24];

    if (timeFormatValues.includes(timeFormat)) return true;

    return false;
  }

  defaultMessage() {
    return "Please include either 12 or 24";
  }
}
