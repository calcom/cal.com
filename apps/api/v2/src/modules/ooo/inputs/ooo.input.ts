import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsDateString, IsInt, IsOptional, IsString, IsEnum } from "class-validator";

export enum OutOfOfficeReason {
  UNSPECIFIED = "unspecified",
  VACATION = "vacation",
  TRAVEL = "travel",
  SICK_LEAVE = "sick",
  PUBLIC_HOLIDAY = "public_holiday",
}

export type OutOfOfficeReasonType = `${OutOfOfficeReason}`;

export class CreateOutOfOfficeEntryDto {
  @IsDateString()
  @ApiProperty({
    description: "The start date and time of the out of office period in ISO 8601 format in UTC timezone.",
    example: "2023-05-01T00:00:00.000Z",
  })
  start!: Date;

  @IsDateString()
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
  })
  reason?: OutOfOfficeReasonType;
}

export class UpdateOutOfOfficeEntryDto extends PartialType(CreateOutOfOfficeEntryDto) {}
