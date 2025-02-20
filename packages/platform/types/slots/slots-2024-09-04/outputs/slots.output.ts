import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsInt, IsString } from "class-validator";

export class Slot_2024_09_04 {
  @ApiProperty({ description: "Start time of slot." })
  @IsDateString()
  start!: string;
}

export class SeatedSlot_2024_09_04 extends Slot_2024_09_04 {
  @ApiProperty({ description: "How many attendees are attending seated event at this slot." })
  @IsInt()
  seatsBooked!: number;

  @ApiProperty({ description: "How many seats are remaining at this slot." })
  @IsInt()
  seatsRemaining!: number;

  @ApiProperty({ description: "Total number of seats for the event type" })
  @IsInt()
  seatsTotal!: number;

  @ApiProperty({ description: "Unique identifier of the booking of the seated event." })
  @IsString()
  bookingUid?: string;
}

export class SlotsOutput_2024_09_04 {
  [key: string]: (Slot_2024_09_04 | SeatedSlot_2024_09_04)[];
}

export class RangeSlot_2024_09_04 extends Slot_2024_09_04 {
  @ApiProperty({ description: "End time of slot." })
  @IsDateString()
  end!: string;
}

export class SeatedRangeSlot_2024_09_04 extends RangeSlot_2024_09_04 {
  @ApiProperty({ description: "How many attendees are attending seated event at this slot." })
  @IsInt()
  seatsBooked!: number;

  @ApiProperty({ description: "How many seats are remaining at this slot." })
  @IsInt()
  seatsRemaining!: number;

  @ApiProperty({ description: "Total number of seats for the event type" })
  @IsInt()
  seatsTotal!: number;

  @ApiProperty({ description: "Unique identifier of the booking of the seated event." })
  @IsString()
  bookingUid?: string;
}
export class RangeSlotsOutput_2024_09_04 {
  [key: string]: (RangeSlot_2024_09_04 | SeatedRangeSlot_2024_09_04)[];
}
