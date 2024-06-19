import { ApiProperty } from "@nestjs/swagger";
import type { ValidationOptions, ValidatorConstraintInterface } from "class-validator";
import { registerDecorator } from "class-validator";
import { IsOptional, ValidatorConstraint } from "class-validator";

export class GetUsersInput_2024_06_18 {
  @IsOptional()
  @ValidateEmailInput_2024_06_18()
  @ApiProperty({
    description: "The email address or an array of email addresses to filter by",
  })
  email?: string | string[];
}

@ValidatorConstraint({ async: true })
class EmailInputValidator_2024_06_18 implements ValidatorConstraintInterface {
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

  defaultMessage() {
    return "Please submit only valid email addresses";
  }
}

function ValidateEmailInput_2024_06_18(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "ValidateEmailInput",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: new EmailInputValidator_2024_06_18(),
    });
  };
}
