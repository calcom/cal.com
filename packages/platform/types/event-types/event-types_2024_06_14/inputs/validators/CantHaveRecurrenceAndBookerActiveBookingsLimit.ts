import { BadRequestException } from "@nestjs/common";
import { registerDecorator, type ValidationArguments, type ValidationOptions } from "class-validator";
import type { BaseCreateEventTypeInput } from "../create-event-type.input";

export const FAILED_RECURRING_EVENT_TYPE_WITH_BOOKER_LIMITS_ERROR_MESSAGE =
  "Can't have `recurrence` and `bookerActiveBookingsLimit` enabled at the same time - recurring events do not support maximum active bookings limit setting.";

export function CantHaveRecurrenceAndBookerActiveBookingsLimit(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (object: any) => {
    registerDecorator({
      name: "cantHaveRecurrenceAndBookerActiveBookingsLimit",
      target: object,
      propertyName: "recurrence or bookerActiveBookingsLimit",
      options: validationOptions,
      constraints: [],
      validator: {
        validate(_: unknown, args: ValidationArguments) {
          const obj = args.object as BaseCreateEventTypeInput;

          const hasActiveRecurrence = obj?.recurrence && "interval" in obj.recurrence;

          const hasActiveBookerLimit =
            obj?.bookerActiveBookingsLimit &&
            ("maximumActiveBookings" in obj.bookerActiveBookingsLimit ||
              "offerReschedule" in obj.bookerActiveBookingsLimit);

          if (hasActiveRecurrence && hasActiveBookerLimit) {
            throw new BadRequestException(FAILED_RECURRING_EVENT_TYPE_WITH_BOOKER_LIMITS_ERROR_MESSAGE);
          }
          return true;
        },
        defaultMessage(): string {
          return FAILED_RECURRING_EVENT_TYPE_WITH_BOOKER_LIMITS_ERROR_MESSAGE;
        },
      },
    });
  };
}
