import { IsDateString } from "class-validator";

export class SlotsOutput_2024_09_04 {
  [key: string]: string[];
}

class Range_2024_09_04 {
  @IsDateString()
  start!: string;

  @IsDateString()
  end!: string;
}

export class RangeSlotsOutput_2024_09_04 {
  [key: string]: Range_2024_09_04[];
}
