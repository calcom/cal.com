import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsString } from "class-validator";

export class DestinationCalendarInputBodyDto {
  @IsString()
  @Expose()
  @ApiProperty({
    example: "apple_calendar",
    description: "The calendar service you want to integrate, as returned by the /calendars endpoint",
    type: "string",
    required: true,
  })
  readonly integration!: string;

  @IsString()
  @Expose()
  @ApiProperty({
    example: "https://caldav.icloud.com/26962146906/calendars/1644422A-1945-4438-BBC0-4F0Q23A57R7S/",
    description:
      "Unique identifier used to represent the specfic calendar, as returned by the /calendars endpoint",
    type: "string",
    required: true,
  })
  readonly externalId!: string;
}
