import { ApiProperty } from "@nestjs/swagger";
import { IsHexColor, IsString } from "class-validator";

// Class representing the event type colors
export class EventTypeColor_2024_06_14 {
  @IsHexColor()
  @IsString()
  @ApiProperty({
    description: "Color used for event types in light theme",
    example: "#292929",
  })
  lightThemeHex!: string;

  @IsHexColor()
  @IsString()
  @ApiProperty({
    description: "Color used for event types in dark theme",
    example: "#fafafa",
  })
  darkThemeHex!: string;
}

export type EventTypeColorsTransformedSchema = {
  darkEventTypeColor: string;
  lightEventTypeColor: string;
};
