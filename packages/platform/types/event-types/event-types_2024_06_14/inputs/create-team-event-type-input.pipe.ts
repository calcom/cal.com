import type { PipeTransform } from "@nestjs/common";
import { Injectable, BadRequestException } from "@nestjs/common";
import { plainToClass } from "class-transformer";
import type { ValidationError } from "class-validator";
import { validateSync } from "class-validator";

import {
  CreateTeamEventTypeInput_2024_06_14,
  CreateTeamVariableLengthEventTypeInput_2024_06_14,
} from "./create-event-type.input";

export type CreateTeamEventTypeInput =
  | CreateTeamEventTypeInput_2024_06_14
  | CreateTeamVariableLengthEventTypeInput_2024_06_14;

@Injectable()
export class CreateTeamEventTypeInputPipe implements PipeTransform {
  // note(Lauris): we need empty constructor otherwise v2 can't be started due to error:
  // CreateEventTypeInputPipe is not a constructor

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  transform(value: CreateTeamEventTypeInput): CreateTeamEventTypeInput {
    if (!value) {
      throw new BadRequestException("Body is required");
    }
    if (typeof value !== "object") {
      throw new BadRequestException("Body should be an object");
    }

    if (this.isVariableLengthTeamEventType(value)) {
      return this.validateVariableLengthTeamEventType(value);
    }

    return this.validateTeamEventType(value);
  }

  private isVariableLengthTeamEventType(
    value: CreateTeamEventTypeInput
  ): value is CreateTeamVariableLengthEventTypeInput_2024_06_14 {
    return value.hasOwnProperty("lengthInMinutesOptions");
  }

  validateVariableLengthTeamEventType(value: CreateTeamVariableLengthEventTypeInput_2024_06_14) {
    const object = plainToClass(CreateTeamVariableLengthEventTypeInput_2024_06_14, value);

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

  validateTeamEventType(value: CreateTeamEventTypeInput_2024_06_14) {
    const object = plainToClass(CreateTeamEventTypeInput_2024_06_14, value);

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
