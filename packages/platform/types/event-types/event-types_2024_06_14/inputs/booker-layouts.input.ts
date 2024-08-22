import type { ValidatorConstraintInterface, ValidationOptions } from "class-validator";
import { ValidatorConstraint, registerDecorator } from "class-validator";

import {
  BookerLayoutsInputEnum_2024_06_14,
  type BookerLayoutsOutputEnum_2024_06_14,
} from "./enums/booker-layouts.enum";

export type BookerLayoutsTransformedSchema = {
  defaultLayout: BookerLayoutsOutputEnum_2024_06_14;
  enabledLayouts: BookerLayoutsOutputEnum_2024_06_14[];
};

@ValidatorConstraint({ name: "LayoutValidator", async: false })
export class LayoutValidator implements ValidatorConstraintInterface {
  validate(value: any) {
    const validValues = Object.values(BookerLayoutsInputEnum_2024_06_14);
    return validValues.includes(value);
  }

  defaultMessage() {
    const validValues = Object.values(BookerLayoutsInputEnum_2024_06_14).join(", ");
    return `Invalid layout. Valid options are: ${validValues}`;
  }
}

function IsValidLayout(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "IsValidLayout",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: new LayoutValidator(),
    });
  };
}

export class BookerLayouts_2024_06_14 {
  @IsValidLayout({ message: "defaultLayout must be one of the valid layouts." })
  defaultLayout!: BookerLayoutsInputEnum_2024_06_14;

  @IsValidLayout({ message: "enabledLayouts must be one of the valid layouts." })
  enabledLayouts!: BookerLayoutsInputEnum_2024_06_14[];
}
