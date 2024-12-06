import type { PipeTransform } from "@nestjs/common";
import { Injectable, BadRequestException } from "@nestjs/common";
import { plainToClass } from "class-transformer";
import type { ValidationError } from "class-validator";
import { validateSync } from "class-validator";

import { CreateRecurringBookingInput_2024_08_13 } from "./create-booking.input";
import { CreateBookingInput_2024_08_13 } from "./create-booking.input";
import { CreateInstantBookingInput_2024_08_13 } from "./create-booking.input";

export type CreateBookingInput =
  | CreateBookingInput_2024_08_13
  | CreateRecurringBookingInput_2024_08_13
  | CreateInstantBookingInput_2024_08_13;

@Injectable()
export class CreateBookingInputPipe implements PipeTransform {
  // note(Lauris): we need empty constructor otherwise v2 can't be started due to error:
  // CreateBookingInputPipe is not a constructor

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  transform(value: CreateBookingInput): CreateBookingInput {
    if (!value) {
      throw new BadRequestException("Body is required");
    }
    if (typeof value !== "object") {
      throw new BadRequestException("Body should be an object");
    }

    if (this.isRecurringBookingInput(value)) {
      return this.validateRecurringBooking(value);
    }

    if (this.isInstantBookingInput(value)) {
      return this.validateInstantBooking(value);
    }

    return this.validateBooking(value);
  }

  validateBooking(value: CreateBookingInput_2024_08_13) {
    const object = plainToClass(CreateBookingInput_2024_08_13, value);

    const errors = validateSync(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
    });

    if (errors.length > 0) {
      throw new BadRequestException(this.formatErrors(errors));
    }

    return object;
  }

  validateRecurringBooking(value: CreateRecurringBookingInput_2024_08_13) {
    const object = plainToClass(CreateRecurringBookingInput_2024_08_13, value);

    const errors = validateSync(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
    });

    if (errors.length > 0) {
      throw new BadRequestException(this.formatErrors(errors));
    }

    return object;
  }

  validateInstantBooking(value: CreateInstantBookingInput_2024_08_13) {
    const object = plainToClass(CreateInstantBookingInput_2024_08_13, value);

    const errors = validateSync(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
    });

    if (errors.length > 0) {
      throw new BadRequestException(this.formatErrors(errors));
    }

    return object;
  }

  private formatErrors(errors: ValidationError[]): string {
    return errors
      .map((err) => {
        const constraints = err.constraints ? Object.values(err.constraints).join(", ") : "";
        const childrenErrors =
          err.children && err.children.length > 0 ? `${this.formatErrors(err.children)}` : "";
        return `${err.property} property is wrong,${constraints} ${childrenErrors}`;
      })
      .join(", ");
  }

  private isRecurringBookingInput(
    value: CreateBookingInput
  ): value is CreateRecurringBookingInput_2024_08_13 {
    return value.hasOwnProperty("recurrenceCount");
  }

  private isInstantBookingInput(value: CreateBookingInput): value is CreateInstantBookingInput_2024_08_13 {
    return value.hasOwnProperty("instant") && "instant" in value && value.instant === true;
  }
}
