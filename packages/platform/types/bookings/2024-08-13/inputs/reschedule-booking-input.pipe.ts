import type { PipeTransform } from "@nestjs/common";
import { Injectable, BadRequestException } from "@nestjs/common";
import { plainToClass } from "class-transformer";
import type { ValidationError } from "class-validator";
import { validateSync } from "class-validator";

import {
  RescheduleBookingInput_2024_08_13,
  RescheduleSeatedBookingInput_2024_08_13,
} from "./reschedule-booking.input";

export type RescheduleBookingInput =
  | RescheduleBookingInput_2024_08_13
  | RescheduleSeatedBookingInput_2024_08_13;

@Injectable()
export class RescheduleBookingInputPipe implements PipeTransform {
  // note(Lauris): we need empty constructor otherwise v2 can't be started due to error:
  // RescheduleBookingInputPipe is not a constructor

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  transform(value: RescheduleBookingInput): RescheduleBookingInput {
    if (!value) {
      throw new BadRequestException("Body is required");
    }
    if (typeof value !== "object") {
      throw new BadRequestException("Body should be an object");
    }

    if (this.isSeatedRescheduleInput(value)) {
      return this.validateSeatedReschedule(value);
    }

    return this.validateReschedule(value);
  }

  validateReschedule(value: RescheduleBookingInput_2024_08_13) {
    const object = plainToClass(RescheduleBookingInput_2024_08_13, value);

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

  validateSeatedReschedule(value: RescheduleSeatedBookingInput_2024_08_13) {
    const object = plainToClass(RescheduleSeatedBookingInput_2024_08_13, value);

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

  private isSeatedRescheduleInput(
    value: RescheduleBookingInput
  ): value is RescheduleSeatedBookingInput_2024_08_13 {
    return "seatUid" in value;
  }
}
