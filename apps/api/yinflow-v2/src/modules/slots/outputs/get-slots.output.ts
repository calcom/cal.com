import { ApiExtraModels, ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsInt, IsString, ValidateNested } from "class-validator";

import { ApiResponseWithoutData } from "@calcom/platform-types";

class Slot_2024_09_04 {
  @ApiProperty({ description: "Start time of slot." })
  @IsDateString()
  start!: string;
}

class SeatedSlot_2024_09_04 extends Slot_2024_09_04 {
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

class SlotsOutput_2024_09_04 {
  [key: string]: (Slot_2024_09_04 | SeatedSlot_2024_09_04)[];
}

class RangeSlot_2024_09_04 extends Slot_2024_09_04 {
  @ApiProperty({ description: "End time of slot." })
  @IsDateString()
  end!: string;
}

class SeatedRangeSlot_2024_09_04 extends RangeSlot_2024_09_04 {
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
class RangeSlotsOutput_2024_09_04 {
  [key: string]: (RangeSlot_2024_09_04 | SeatedRangeSlot_2024_09_04)[];
}

@ApiExtraModels(SlotsOutput_2024_09_04, RangeSlotsOutput_2024_09_04)
export class GetSlotsOutput_2024_09_04 extends ApiResponseWithoutData {
  @ValidateNested()
  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(SlotsOutput_2024_09_04) },
      { $ref: getSchemaPath(RangeSlotsOutput_2024_09_04) },
    ],
  })
  @Type(() => Object)
  data!: SlotsOutput_2024_09_04 | RangeSlotsOutput_2024_09_04;
}
