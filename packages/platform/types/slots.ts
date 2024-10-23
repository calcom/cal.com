import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsArray, IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString } from "class-validator";

export class GetAvailableSlotsInput {
  @IsDateString()
  @ApiProperty({
    description: "Start date string starting from which to fetch slots in UTC timezone.",
    example: "2022-06-14T00:00:00.000Z",
  })
  startTime!: string;

  @IsDateString()
  @ApiProperty({
    description: "End date string until which to fetch slots in UTC timezone.",
    example: "2022-06-14T23:59:59.999Z",
  })
  endTime!: string;

  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: "Event Type ID for which slots are being fetched.", example: 100 })
  eventTypeId?: number;

  @IsString()
  @IsOptional()
  @ApiProperty({ description: "Slug of the event type for which slots are being fetched." })
  eventTypeSlug?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiProperty({
    description: "Only for dynamic events - list of usernames for which slots are being fetched.",
  })
  usernameList?: string[];

  @IsBoolean()
  @IsOptional()
  debug?: boolean;

  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @IsOptional()
  @ApiProperty({ description: "Only for dynamic events - length of returned slots." })
  duration?: number;

  @IsOptional()
  @IsString()
  rescheduleUid?: string | null;

  @IsString()
  @IsOptional()
  timeZone?: string;

  @IsString()
  @IsOptional()
  orgSlug?: string;
}

export class RemoveSelectedSlotInput {
  @IsString()
  @IsOptional()
  @ApiProperty({
    description: "Unique identifier for the slot to be removed.",
    example: "e2a7bcf9-cc7b-40a0-80d3-657d391775a6",
    required: true,
  })
  uid?: string;
}

export class ReserveSlotInput {
  @IsInt()
  @ApiProperty({ description: "Event Type ID for which timeslot is being reserved.", example: 100 })
  eventTypeId!: number;

  @IsDateString()
  @ApiProperty({
    description: "Start date of the slot in UTC timezone.",
    example: "2022-06-14T00:00:00.000Z",
  })
  slotUtcStartDate!: string;

  @IsDateString()
  @ApiProperty({ description: "End date of the slot in UTC timezone.", example: "2022-06-14T00:30:00.000Z" })
  slotUtcEndDate!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Optional but only for events with seats. Used to retrieve booking of a seated event.",
  })
  bookingUid?: string;
}
