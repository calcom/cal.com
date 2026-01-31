import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class SelectedCalendar_2024_06_14 {
  @ApiProperty({
    description:
      "The integration type of the selected calendar for conflict checking. Refer to the /api/v2/calendars endpoint to retrieve the integration type of your connected calendars.",
    example: "google_calendar",
  })
  @IsString()
  integration!: string;

  @ApiProperty({
    description:
      "The external ID of the selected calendar for conflict checking. Refer to the /api/v2/calendars endpoint to retrieve the external IDs of your connected calendars.",
    example: "primary",
  })
  @IsString()
  externalId!: string;
}
