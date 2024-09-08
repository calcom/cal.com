import { IsInt, IsDateString, IsOptional } from "class-validator";

export class ReserveSlotInput_2024_09_04 {
  @IsInt()
  eventTypeId!: number;

  @IsDateString()
  start!: string;

  @IsInt()
  @IsOptional()
  reservationLength = 5;
}
