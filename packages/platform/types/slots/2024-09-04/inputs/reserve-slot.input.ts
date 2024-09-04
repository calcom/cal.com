import { IsInt, IsDateString } from "class-validator";

export class ReserveSlotInput_2024_09_04 {
  @IsInt()
  eventTypeId!: number;

  @IsDateString()
  start!: string;
}
