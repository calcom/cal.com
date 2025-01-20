import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsDateString, IsString } from "class-validator";

import { ReserveSlotInput_2024_09_04 } from "../inputs";

export class ReserveSlotOutput_2024_09_04 extends ReserveSlotInput_2024_09_04 {
  @IsString()
  @ApiProperty({
    example: "e84be5a3-4696-49e3-acc7-b2f3999c3b94",
    description: "The unique identifier of the reservation.",
  })
  @Expose()
  reservationUid!: string;

  @IsDateString()
  @ApiProperty({
    example: "2024-09-04T10:00:00Z",
    description: "ISO 8601 datestring in UTC timezone representing slot end.",
  })
  slotEnd!: string;

  @IsDateString()
  @ApiProperty({
    example: "2023-09-04T10:00:00Z",
    description: "ISO 8601 datestring in UTC timezone representing time until which the slot is reserved.",
  })
  reservationUntil!: string;
}
