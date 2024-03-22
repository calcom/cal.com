import { ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

@ValidatorConstraint({ name: "isTimeFormat", async: false })
export class IsTimeFormat implements ValidatorConstraintInterface {
  validate(timeFormat: number) {
    return timeFormat === 12 || timeFormat === 24;
  }

  defaultMessage() {
    return "timeFormat must be a number either 12 or 24";
  }
}
