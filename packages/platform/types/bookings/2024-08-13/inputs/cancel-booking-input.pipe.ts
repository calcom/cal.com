import type { PipeTransform } from "@nestjs/common";
import { BadRequestException, Injectable } from "@nestjs/common";
import { plainToClass } from "class-transformer";
import type { ValidationError } from "class-validator";
import { validateSync } from "class-validator";
import { CancelBookingInput_2024_08_13, CancelSeatedBookingInput_2024_08_13 } from "./cancel-booking.input";

export type CancelBookingInput = CancelBookingInput_2024_08_13 | CancelSeatedBookingInput_2024_08_13;

@Injectable()
export class CancelBookingInputPipe implements PipeTransform {
  // note(Lauris): we need empty constructor otherwise v2 can't be started due to error:
  // CancelBookingInputPipe is not a constructor

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  transform(value: CancelBookingInput): CancelBookingInput {
    if (!value) {
      throw new BadRequestException("Body is required");
    }
    if (typeof value !== "object") {
      throw new BadRequestException("Body should be an object");
    }

    if (this.isCancelSeatedBookingInput(value)) {
      return this.validateCancelBookingSeated(value);
    }

    return this.validateCancelBooking(value);
  }

  validateCancelBooking(value: CancelBookingInput_2024_08_13) {
    const object = plainToClass(CancelBookingInput_2024_08_13, value);

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

  validateCancelBookingSeated(value: CancelSeatedBookingInput_2024_08_13) {
    const object = plainToClass(CancelSeatedBookingInput_2024_08_13, value);

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

  private isCancelSeatedBookingInput(
    value: CancelBookingInput
  ): value is CancelSeatedBookingInput_2024_08_13 {
    return Object.hasOwn(value, "seatUid");
  }
}
