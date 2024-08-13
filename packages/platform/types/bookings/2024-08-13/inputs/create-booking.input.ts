import { IsDateString } from "class-validator";

export class CreateBookingInput_2024_08_13 {
  @IsDateString()
  start!: string;
}
