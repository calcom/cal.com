import { IsDateString } from "class-validator";

export class Slot_2024_09_04 {
  @IsDateString()
  start!: string;
}

export class SlotsOutput_2024_09_04 {
  [key: string]: Slot_2024_09_04[];
}

export class RangeSlot_2024_09_04 extends Slot_2024_09_04 {
  @IsDateString()
  end!: string;
}

export class RangeSlotsOutput_2024_09_04 {
  [key: string]: RangeSlot_2024_09_04[];
}
