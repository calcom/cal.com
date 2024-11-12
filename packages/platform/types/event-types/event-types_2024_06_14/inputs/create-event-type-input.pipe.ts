import type { PipeTransform } from "@nestjs/common";
import { Injectable, BadRequestException } from "@nestjs/common";
import { plainToClass } from "class-transformer";
import type { ValidationError } from "class-validator";
import { validateSync } from "class-validator";

import {
  CreateEventTypeInput_2024_06_14,
  CreateVariableLengthEventTypeInput_2024_06_14,
} from "./create-event-type.input";

export type CreateEventTypeInput =
  | CreateEventTypeInput_2024_06_14
  | CreateVariableLengthEventTypeInput_2024_06_14;

@Injectable()
export class CreateEventTypeInputPipe implements PipeTransform {
  // note(Lauris): we need empty constructor otherwise v2 can't be started due to error:
  // CreateEventTypeInputPipe is not a constructor

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  transform(value: CreateEventTypeInput): CreateEventTypeInput {
    if (!value) {
      throw new BadRequestException("Body is required");
    }
    if (typeof value !== "object") {
      throw new BadRequestException("Body should be an object");
    }

    if (this.isVariableLengthEventType(value)) {
      return this.validateVariableLengthEventType(value);
    }

    return this.validateEventType(value);
  }

  private isVariableLengthEventType(
    value: CreateEventTypeInput
  ): value is CreateVariableLengthEventTypeInput_2024_06_14 {
    return value.hasOwnProperty("lengthInMinutesOptions");
  }

  validateVariableLengthEventType(value: CreateVariableLengthEventTypeInput_2024_06_14) {
    const object = plainToClass(CreateVariableLengthEventTypeInput_2024_06_14, value);

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

  validateEventType(value: CreateEventTypeInput_2024_06_14) {
    const object = plainToClass(CreateEventTypeInput_2024_06_14, value);

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
}
