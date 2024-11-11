import type { ValidatorConstraintInterface } from "class-validator";
import { ValidatorConstraint } from "class-validator";

@ValidatorConstraint({ name: "themeValidator", async: false })
export class ThemeValidator implements ValidatorConstraintInterface {
  validate(theme: string) {
    const themeValues = ["dark", "light"];

    if (themeValues.includes(theme)) return true;

    return false;
  }

  defaultMessage() {
    return "Please include either 'dark' or 'light";
  }
}
