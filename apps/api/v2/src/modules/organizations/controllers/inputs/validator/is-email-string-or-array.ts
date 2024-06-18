import { Injectable } from "@nestjs/common";
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

@Injectable()
@ValidatorConstraint({ name: "isSingleEmailOrEmailArray" })
export class IsSingleEmailOrEmailArray implements ValidatorConstraintInterface {
  validate(value: any): boolean | Promise<boolean> {
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

  defaultMessage(validationArguments?: ValidationArguments | undefined): string {
    return "Please submit only valid email addresses";
  }
}
