import { BadRequestException } from "@nestjs/common";
import { registerDecorator, type ValidationOptions } from "class-validator";

/**
 * note(Lauris): See example in event-types_2024_06_14/inputs/create-event-type.input.ts file bookerActiveBookingsLimit property.
 * This validator is used if type can be SomeClass | Disabled_2024_06_14 to ensure that if {disabled: false} is passed
 * meaning that the feature is enabled that other properties are provided too.
 */

export const REQUIRES_AT_LEAST_ONE_PROPERTY_ERROR =
  "When disabled is false {disabled: false} at least one other property must be provided, because it means that the property is enabled but then other properties must be provided too.";

export function RequiresAtLeastOnePropertyWhenNotDisabled(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: "requiresAtLeastOnePropertyWhenNotDisabled",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: {
        validate(value: unknown) {
          if (!value || typeof value !== "object") {
            return true;
          }

          const obj = value as Record<string, unknown>;

          if (obj.disabled !== false) {
            return true;
          }

          const otherProperties = Object.keys(obj).filter((key) => key !== "disabled");
          const hasAtLeastOneOtherProperty = otherProperties.length > 0;

          if (!hasAtLeastOneOtherProperty) {
            throw new BadRequestException(REQUIRES_AT_LEAST_ONE_PROPERTY_ERROR);
          }

          return true;
        },
        defaultMessage(): string {
          return REQUIRES_AT_LEAST_ONE_PROPERTY_ERROR;
        },
      },
    });
  };
}
