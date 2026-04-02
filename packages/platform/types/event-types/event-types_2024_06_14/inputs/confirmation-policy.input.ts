import { ConfirmationPolicyEnum, NoticeThresholdUnitEnum } from "@calcom/platform-enums";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import type { ValidationOptions, ValidatorConstraintInterface } from "class-validator";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  registerDecorator,
  ValidateIf,
  ValidateNested,
  ValidatorConstraint,
} from "class-validator";
import type { Disabled_2024_06_14 } from "./disabled.input";

// Class representing the notice threshold
export class NoticeThreshold_2024_06_14 {
  @IsEnum(NoticeThresholdUnitEnum)
  @ApiProperty({
    description: "The unit of time for the notice threshold (e.g., minutes, hours)",
    example: NoticeThresholdUnitEnum.MINUTES,
  })
  unit!: NoticeThresholdUnitEnum;

  @IsInt()
  @ApiProperty({
    description: "The time value for the notice threshold",
    example: 30,
  })
  count!: number;
}

// Class representing the confirmation requirements
export class BaseConfirmationPolicy_2024_06_14 {
  @IsEnum(ConfirmationPolicyEnum)
  @ApiProperty({
    description: "The policy that determines when confirmation is required",
    enum: [ConfirmationPolicyEnum.ALWAYS, ConfirmationPolicyEnum.TIME],
    example: ConfirmationPolicyEnum.ALWAYS,
  })
  type!: ConfirmationPolicyEnum;

  @ValidateIf((o) => o.type === ConfirmationPolicyEnum.TIME || o.noticeThreshold !== undefined)
  @ValidateNested()
  @Type(() => NoticeThreshold_2024_06_14)
  @ApiPropertyOptional({
    description: "The notice threshold required before confirmation is needed. Required when type is 'time'.",
    type: NoticeThreshold_2024_06_14,
  })
  noticeThreshold?: NoticeThreshold_2024_06_14;

  @IsBoolean()
  @ApiProperty({
    description: "Unconfirmed bookings still block calendar slots.",
    type: Boolean,
  })
  blockUnconfirmedBookingsInBooker!: boolean;

  @IsOptional()
  @IsBoolean()
  disabled?: boolean = false;
}

export type ConfirmationPolicy_2024_06_14 = BaseConfirmationPolicy_2024_06_14 | Disabled_2024_06_14;

// Validator for confirmation settings
@ValidatorConstraint({ name: "ConfirmationPolicyValidator", async: false })
export class ConfirmationPolicyValidator implements ValidatorConstraintInterface {
  validate(value: ConfirmationPolicy_2024_06_14): boolean {
    if (value.disabled) {
      return true;
    }
    const { type, noticeThreshold } = value;

    if (!type) return false;

    if (type === ConfirmationPolicyEnum.ALWAYS) {
      return true;
    }

    if (type === ConfirmationPolicyEnum.TIME) {
      return !!(
        noticeThreshold &&
        typeof noticeThreshold.count === "number" &&
        typeof noticeThreshold.unit === "string"
      );
    }
    return false;
  }

  defaultMessage(): string {
    return `Invalid requiresConfirmation structure. Use "type": "always" or provide a valid time and unit in "noticeThreshold" for "type": "time".`;
  }
}

// Custom decorator for confirmation validation
export function ValidateConfirmationPolicy(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: "ValidateConfirmationPolicy",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: ConfirmationPolicyValidator,
    });
  };
}

export type NoticeThresholdTransformedSchema = {
  unit: NoticeThresholdUnitEnum;
  time: number;
};

export type ConfirmationPolicyTransformedSchema = {
  requiresConfirmation: boolean;
  requiresConfirmationThreshold?: NoticeThresholdTransformedSchema;
  requiresConfirmationWillBlockSlot: boolean;
};
