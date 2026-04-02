import type { ValidatorConstraintInterface } from "class-validator";
import { ValidatorConstraint } from "class-validator";

@ValidatorConstraint({ name: "IsEmailStringOrArray", async: false })
export class IsEmailStringOrArray implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value === "string") {
      return this.validateEmail(value);
    } else if (Array.isArray(value)) {
      return value.every((item) => this.validateEmail(item));
    }
    return false;
  }

  validateEmail(email: string): boolean {
    const regex =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return regex.test(email);
  }

  defaultMessage() {
    return "Please submit only valid email addresses";
  }
}
