import type { ValidationOptions, ValidationArguments } from "class-validator";
import { registerDecorator } from "class-validator";

export const METADATA_DOCS = `You can store any additional data you want here.
Metadata must have at most 50 keys, each key up to 40 characters.
Values can be strings (up to 500 characters), numbers, or booleans.`;

export type Metadata = Record<string, string | number | boolean>;

export function ValidateMetadata(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "ValidateMetadata",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(metadata: any) {
          if (typeof metadata !== "object" || metadata === null) {
            return false;
          }

          const keys = Object.keys(metadata);

          if (keys.length > 50) {
            return false;
          }

          for (const key of keys) {
            if (key.length > 40) {
              return false;
            }

            if (isInvalidValidKeyValue(metadata[key])) {
              return false;
            }
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be an object with up to 50 keys, each key name up to 40 characters, and values with a maximum length of 500 characters.`;
        },
      },
    });
  };
}

function isInvalidValidKeyValue(keyValue: any) {
  if (typeof keyValue === "number" || typeof keyValue === "boolean") {
    return false;
  }

  if (typeof keyValue === "string") {
    return keyValue.length > 500;
  }

  return true;
}
