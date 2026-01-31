import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class SelectedCalendarOutput_2024_06_14 {
  @ApiProperty({
    description: "The integration type of the selected calendar.",
    example: "google_calendar",
  })
  @IsString()
  integration!: string;

  @ApiProperty({
    description: "The external ID of the selected calendar.",
    example: "primary",
  })
  @IsString()
  externalId!: string;
}
