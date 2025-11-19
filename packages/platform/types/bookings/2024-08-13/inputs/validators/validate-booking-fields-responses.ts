import type { ValidationArguments, ValidationOptions } from "class-validator";
import { registerDecorator } from "class-validator";

export function ValidateBookingFieldsResponses(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "ValidateBookingFieldsResponses",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(bookingFieldsResponses: any) {
          if (typeof bookingFieldsResponses !== "object" || bookingFieldsResponses === null) {
            return false;
          }

          const values = Object.values(bookingFieldsResponses);

          for (const value of values) {
            if (value === null) {
              return false;
            }
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be an object where all values are non-null strings.`;
        },
      },
    });
  };
}
