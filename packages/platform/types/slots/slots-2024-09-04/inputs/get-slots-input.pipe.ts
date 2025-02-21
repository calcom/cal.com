import type { PipeTransform } from "@nestjs/common";
import { Injectable, BadRequestException } from "@nestjs/common";
import { plainToClass } from "class-transformer";
import type { ValidationError } from "class-validator";
import { validateSync } from "class-validator";

import { ById_2024_09_04, BySlug_2024_09_04 } from "./get-slots.input";
import { ByUsernames_2024_09_04 } from "./get-slots.input";

export type GetSlotsInput_2024_09_04 = ById_2024_09_04 | BySlug_2024_09_04 | ByUsernames_2024_09_04;

@Injectable()
export class GetSlotsInputPipe implements PipeTransform {
  // note(Lauris): we need empty constructor otherwise v2 can't be started due to error:
  // CreateBookingInputPipe is not a constructor

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  transform(value: GetSlotsInput_2024_09_04): GetSlotsInput_2024_09_04 {
    if (!value) {
      throw new BadRequestException("Body is required");
    }
    if (typeof value !== "object") {
      throw new BadRequestException("Body should be an object");
    }

    if (this.isById(value)) {
      return this.validateById(value);
    }

    if (this.isBySlug(value)) {
      return this.validateBySlug(value);
    }

    return this.validateByUsernames(value);
  }

  validateById(value: ById_2024_09_04) {
    const object = plainToClass(ById_2024_09_04, value);

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

  validateBySlug(value: BySlug_2024_09_04) {
    const object = plainToClass(BySlug_2024_09_04, value);

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

  validateByUsernames(value: ByUsernames_2024_09_04) {
    const object = plainToClass(ByUsernames_2024_09_04, value);

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

  private isById(value: GetSlotsInput_2024_09_04): value is ById_2024_09_04 {
    return value.hasOwnProperty("eventTypeId");
  }

  private isBySlug(value: GetSlotsInput_2024_09_04): value is BySlug_2024_09_04 {
    return value.hasOwnProperty("eventTypeSlug");
  }
}
