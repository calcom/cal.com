import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";
import { SeatedAttendee } from "@calcom/platform-types";

export class GetBookingSeatOutput_2024_08_13 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ValidateNested()
  @ApiProperty({
    type: SeatedAttendee,
    description: "Seat data including attendee information",
  })
  @Type(() => SeatedAttendee)
  data!: SeatedAttendee;
}
