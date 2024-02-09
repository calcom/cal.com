import { IsDate, IsInt, IsOptional, IsString } from "class-validator";

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
