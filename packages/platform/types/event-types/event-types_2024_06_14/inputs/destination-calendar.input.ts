import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class DestinationCalendar_2024_06_14 {
  @ApiProperty({
    description:
      "The integration type of the destination calendar. Refer to the /api/v2/calendars endpoint to retrieve the integration type of your connected calendars.",
  })
  @IsString()
  integration!: string;

  @ApiProperty({
    description:
      "The external ID of the destination calendar. Refer to the /api/v2/calendars endpoint to retrieve the external IDs of your connected calendars.",
  })
  @IsString()
  externalId!: string;
}
