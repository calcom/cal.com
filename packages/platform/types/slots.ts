import { Transform } from "class-transformer";
import { IsArray, IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString } from "class-validator";

export class GetAvailableSlotsInput {
  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @IsOptional()
  eventTypeId?: number;

  @IsString()
  @IsOptional()
  eventTypeSlug?: string;

  @IsArray()
  @IsString({ each: true })
  usernameList?: string[];

  @IsBoolean()
  @IsOptional()
  debug?: boolean;

  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @IsOptional()
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
  uid?: string;
}

export class ReserveSlotInput {
  @IsInt()
  eventTypeId!: number;

  @IsDateString()
  slotUtcStartDate!: string;

  @IsDateString()
  slotUtcEndDate!: string;

  @IsString()
  @IsOptional()
  bookingUid?: string;
}
