import {
  BookerLayoutsInputEnum_2024_06_14,
  type BookerLayoutsOutputEnum_2024_06_14,
} from "@calcom/platform-enums";
import { ApiProperty } from "@nestjs/swagger";
import type { ValidationArguments, ValidationOptions, ValidatorConstraintInterface } from "class-validator";
import { IsEnum, registerDecorator, ValidatorConstraint } from "class-validator";

export type BookerLayoutsTransformedSchema = {
  defaultLayout: BookerLayoutsOutputEnum_2024_06_14;
  enabledLayouts: BookerLayoutsOutputEnum_2024_06_14[];
};

@ValidatorConstraint({ name: "LayoutValidator", async: false })
export class LayoutValidator implements ValidatorConstraintInterface {
  validate(value: BookerLayoutsInputEnum_2024_06_14 | BookerLayoutsInputEnum_2024_06_14[]) {
    const validValues = Object.values(BookerLayoutsInputEnum_2024_06_14);

    // If the value is an array, check if every item in the array is valid
    if (Array.isArray(value)) {
      return value.every((layout) => validValues.includes(layout));
    }

    // If the value is a single layout, check if it is valid
    return validValues.includes(value);
  }

  defaultMessage() {
    const validValues = Object.values(BookerLayoutsInputEnum_2024_06_14).join(", ");
    return `Invalid layout. Valid options are: ${validValues}`;
  }
}

function IsValidLayout(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: "IsValidLayout",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: new LayoutValidator(),
    });
  };
}

@ValidatorConstraint({ name: "isDefaultLayoutWithinEnabledLayouts", async: false })
export class DefaultLayoutEnabledValidator implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments) {
    const object = args.object as BookerLayouts_2024_06_14;
    if (object.defaultLayout && Array.isArray(object.enabledLayouts) && object.enabledLayouts.length > 0) {
      return object.enabledLayouts.includes(object.defaultLayout);
    }

    return false;
  }

  defaultMessage() {
    return "If you pass the optional 'bookerLayouts' property, you must provide both 'bookerLayouts.defaultLayout' and 'bookerLayouts.enabledLayouts' and 'bookerLayouts.enabledLayouts' must include 'bookerLayouts.defaultLayout'";
  }
}

function IsDefaultLayoutWithinEnabledLayouts(validationOptions?: ValidationOptions) {
  return (object: any) => {
    registerDecorator({
      name: "isDefaultLayoutWithinEnabledLayouts",
      target: object,
      propertyName: "defaultLayout",
      options: validationOptions,
      constraints: [],
      validator: DefaultLayoutEnabledValidator,
    });
  };
}
@IsDefaultLayoutWithinEnabledLayouts()
export class BookerLayouts_2024_06_14 {
  @IsValidLayout({ message: "defaultLayout must be one of the valid layouts - month, week or column" })
  @ApiProperty({ type: String, enum: BookerLayoutsInputEnum_2024_06_14 })
  @IsEnum(BookerLayoutsInputEnum_2024_06_14)
  defaultLayout!: BookerLayoutsInputEnum_2024_06_14;

  @IsValidLayout({
    message: "enabledLayouts must be an array containing valid layouts - month, week or column",
  })
  @ApiProperty({
    type: [String],
    enum: BookerLayoutsInputEnum_2024_06_14,
    description: "Array of valid layouts - month, week or column",
  })
  @IsEnum(BookerLayoutsInputEnum_2024_06_14, {
    each: true,
    message: "enabledLayouts must contain only valid layouts - month, week or column",
  })
  enabledLayouts!: BookerLayoutsInputEnum_2024_06_14[];
}
