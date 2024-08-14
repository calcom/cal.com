import type { PipeTransform } from "@nestjs/common";
import { Injectable, BadRequestException } from "@nestjs/common";
import type { ValidationError } from "class-validator";
import { validateSync } from "class-validator";

import type {
  CreateBookingInput_2024_08_13,
  RescheduleBookingInput_2024_08_13,
} from "./create-booking.input";

@Injectable()
export class CreateBookingInputPipe implements PipeTransform {
  constructor(
    private readonly bookingDto: typeof CreateBookingInput_2024_08_13,
    private readonly rescheduleDto: typeof RescheduleBookingInput_2024_08_13
  ) {}

  transform(value: any) {
    const dtoClass = this.determineDtoClass(value);

    if (!dtoClass) {
      throw new BadRequestException("Invalid request body");
    }

    const object = Object.assign(new dtoClass(), value);
    const errors = validateSync(object);

    if (errors.length > 0) {
      throw new BadRequestException(this.formatErrors(errors));
    }

    return object;
  }

  private determineDtoClass(
    value: any
  ): typeof CreateBookingInput_2024_08_13 | typeof RescheduleBookingInput_2024_08_13 | null {
    if (!value) {
      return null;
    }

    if (value.hasOwnProperty("rescheduleBookingUid")) {
      return this.rescheduleDto;
    } else {
      return this.bookingDto;
    }
  }

  private formatErrors(errors: ValidationError[]): string {
    return errors
      .map((err) => {
        return `${err.property} has wrong value ${err.value}, ${Object.values(err.constraints || {}).join(
          ", "
        )}`;
      })
      .join(", ");
  }
}
