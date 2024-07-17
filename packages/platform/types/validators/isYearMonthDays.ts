import type { ValidatorConstraintInterface } from "class-validator";
import { ValidatorConstraint } from "class-validator";
import { DateTime } from "luxon";

@ValidatorConstraint({ name: "IsYearMonthDays", async: false })
export class IsYearMonthDays implements ValidatorConstraintInterface {
  validate(dateString: string): boolean {
    try {
      // Attempt to parse the date string
      const dateTime = DateTime.fromFormat(dateString, "yyyy-MM-dd");

      // Check if the parsed date is valid
      return dateTime.isValid;
    } catch (error) {
      return false;
    }
  }

  defaultMessage() {
    return "time format must be YEAR-MONTH-DAYS (e.g. 2022-01-01)";
  }
}
