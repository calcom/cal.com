import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsOptional, IsInt, ValidateNested, IsBoolean } from "class-validator";
import type { ValidatorConstraintInterface, ValidationOptions } from "class-validator";
import { ValidatorConstraint, registerDecorator } from "class-validator";

import { ConfirmationPolicyEnum, NoticeThresholdUnitEnum } from "@calcom/platform-enums";

import type { Disabled_2024_06_14 } from "./disabled.input";

// Class representing the notice threshold
export class NoticeThreshold_2024_06_14 {
  @IsInt()
  @ApiProperty({
    description: "The time value for the notice threshold",
    example: 30,
  })
  time!: number;

  @IsEnum(NoticeThresholdUnitEnum)
  @ApiProperty({
    description: "The unit of time for the notice threshold (e.g., minutes, hours)",
    example: NoticeThresholdUnitEnum.MINUTES,
  })
  unit!: NoticeThresholdUnitEnum;
}

// Class representing the confirmation requirements
export class BaseRequiresConfirmation_2024_06_14 {
  @IsEnum(ConfirmationPolicyEnum)
  @ApiProperty({
    description: "The policy that determines when confirmation is required",
    example: ConfirmationPolicyEnum.ALWAYS,
  })
  confirmationPolicy!: ConfirmationPolicyEnum;

  @IsOptional()
  @ValidateNested()
  @Type(() => NoticeThreshold_2024_06_14)
  @ApiPropertyOptional({
    description:
      "The notice threshold required before confirmation is needed. Required when confirmationPolicy is 'time'.",
    type: NoticeThreshold_2024_06_14,
  })
  noticeThreshold?: NoticeThreshold_2024_06_14;

  @IsBoolean()
  blockUnconfirmedBookingsInBooker!: boolean;

  disabled?: false;
}

export type RequiresConfirmation_2024_06_14 = BaseRequiresConfirmation_2024_06_14 | Disabled_2024_06_14;

// Validator for confirmation settings
@ValidatorConstraint({ name: "ConfirmationValidator", async: false })
export class ConfirmationValidator implements ValidatorConstraintInterface {
  validate(value: RequiresConfirmation_2024_06_14): boolean {
    if ("disabled" in value) {
      return true;
    }
    if ("confirmationPolicy" in value && "noticeThreshold" in value) {
      const { confirmationPolicy, noticeThreshold } = value;

      if (confirmationPolicy === ConfirmationPolicyEnum.ALWAYS) {
        return true;
      }

      if (confirmationPolicy === ConfirmationPolicyEnum.TIME) {
        return !!(
          noticeThreshold &&
          typeof noticeThreshold.time === "number" &&
          typeof noticeThreshold.unit === "string"
        );
      }
    }
    return false;
  }

  defaultMessage(): string {
    return `Invalid requiresConfirmation structure. Use "confirmationPolicy": "always" or provide a valid time and unit in "noticeThreshold" for "confirmationPolicy": "time".`;
  }
}

// Custom decorator for confirmation validation
export function ValidateRequiresConfirmation(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "ValidateRequiresConfirmation",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: ConfirmationValidator,
    });
  };
}

export type RequiresConfirmationTransformedSchema = {
  requiresConfirmation: boolean;
  requiresConfirmationThreshold?: NoticeThreshold_2024_06_14;
  requiresConfirmationWillBlockSlot: boolean;
};
