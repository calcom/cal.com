import type { ValidationOptions, ValidationArguments } from "class-validator";
import { registerDecorator } from "class-validator";

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
  if (!isString(keyValue)) {
    return true;
  }

  if (isTooLong(keyValue)) {
    return true;
  }

  return false;
}

function isString(keyValue: any): keyValue is string {
  return typeof keyValue === "string";
}

function isTooLong(keyValue: string) {
  return keyValue.length > 500;
}
