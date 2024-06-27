import type { ValidatorConstraintInterface } from "class-validator";
import { ValidatorConstraint } from "class-validator";

@ValidatorConstraint({ name: "weekdayValidator", async: false })
export class WeekdayValidator implements ValidatorConstraintInterface {
  validate(weekday: string) {
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    if (weekdays.includes(weekday)) return true;
    return false;
  }

  defaultMessage() {
    return "Please include a valid weekday";
  }
}
