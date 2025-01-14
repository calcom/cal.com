import { BadRequestException } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsDate, IsInt, IsOptional, IsString, IsEnum, isDate } from "class-validator";

export enum OutOfOfficeReason {
  UNSPECIFIED = "unspecified",
  VACATION = "vacation",
  TRAVEL = "travel",
  SICK_LEAVE = "sick",
  PUBLIC_HOLIDAY = "public_holiday",
}

export type OutOfOfficeReasonType = `${OutOfOfficeReason}`;

const isDateString = (dateString: string) => {
  try {
    const isoDateRegex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{3})?Z$/;
    return isoDateRegex.test(dateString);
  } catch {
    throw new BadRequestException("Invalid Date.");
  }
};

export class CreateOutOfOfficeEntryDto {
  @Transform(({ value }: { value: string }) => {
    if (isDateString(value)) {
      const date = new Date(value);
      date.setUTCHours(0, 0, 0, 0);
      return date;
    }
    throw new BadRequestException("Invalid Date.");
  })
  @IsDate()
  @ApiProperty({
    description: "The start date and time of the out of office period in ISO 8601 format in UTC timezone.",
    example: "2023-05-01T00:00:00.000Z",
  })
  start!: Date;

  @Transform(({ value }: { value: string }) => {
    if (isDateString(value)) {
      const date = new Date(value);
      date.setUTCHours(23, 59, 59, 999);
      return date;
    }
    throw new BadRequestException("Invalid Date.");
  })
  @IsDate()
  @ApiProperty({
    description: "The end date and time of the out of office period in ISO 8601 format in UTC timezone.",
    example: "2023-05-10T23:59:59.999Z",
  })
  end!: Date;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Optional notes for the out of office entry.",
    example: "Vacation in Hawaii",
  })
  notes?: string;

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({
    description: "The ID of the user covering for the out of office period, if applicable.",
    example: 2,
  })
  toUserId?: number;

  @IsEnum(OutOfOfficeReason)
  @IsOptional()
  @ApiPropertyOptional({
    description: "the reason for the out of office entry, if applicable",
    example: "vacation",
    enum: OutOfOfficeReason,
  })
  reason?: OutOfOfficeReasonType;
}

export class UpdateOutOfOfficeEntryDto extends PartialType(CreateOutOfOfficeEntryDto) {}
