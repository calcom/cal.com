import type { ValidatorConstraintInterface, ValidationOptions } from "class-validator";
import { ValidatorConstraint, registerDecorator } from "class-validator";

import { validateCustomEventName } from "@calcom/core/event";

@ValidatorConstraint({ name: "CustomEventNameValidator", async: false })
export class CustomEventNameValidator implements ValidatorConstraintInterface {
  private message = "";
  validate(value: string): boolean {
    const validationResult = validateCustomEventName(value);
    if (validationResult !== true) {
      this.message = `Invalid event name variables: ${validationResult}`;
    }
    return true;
  }

  defaultMessage(): string {
    return this.message;
  }
}

export function IsValidCustomEventName(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "IsValidCustomEventName",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: CustomEventNameValidator,
    });
  };
}
