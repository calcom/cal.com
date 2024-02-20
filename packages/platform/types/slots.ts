import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsDate,
} from "class-validator";

export class GetAvailableSlotsInput {
  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @IsNumber()
  @IsOptional()
  eventTypeId?: number;

  @IsArray()
  @IsString({ each: true })
  usernameList?: string[];

  @IsBoolean()
  @IsOptional()
  debug?: boolean;

  @IsNumber()
  @IsOptional()
  duration?: number;
}

export class RemoveSelectedSlotInput {
  @IsString()
  @IsOptional()
  uid?: string;
}

export class ReserveSlotInput {
  @IsInt()
  eventTypeId!: number;

  @IsDate()
  slotUtcStartDate!: string;

  @IsDate()
  slotUtcEndDate!: string;

  @IsString()
  @IsOptional()
  bookingUid?: string;
}
