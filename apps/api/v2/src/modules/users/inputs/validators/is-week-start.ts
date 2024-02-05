import { ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

@ValidatorConstraint({ name: "isWeekStart", async: false })
export class IsWeekStart implements ValidatorConstraintInterface {
  validate(weekStart: string) {
    if (!weekStart) return false;

    const lowerCaseWeekStart = weekStart.toLowerCase();
    return (
      lowerCaseWeekStart === "monday" ||
      lowerCaseWeekStart === "tuesday" ||
      lowerCaseWeekStart === "wednesday" ||
      lowerCaseWeekStart === "thursday" ||
      lowerCaseWeekStart === "friday" ||
      lowerCaseWeekStart === "saturday" ||
      lowerCaseWeekStart === "sunday"
    );
  }

  defaultMessage() {
    return "weekStart must be a string either Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, or Sunday";
  }
}
