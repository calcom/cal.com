import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsString, IsEnum } from "class-validator";

import {
  APPLE_CALENDAR_TYPE,
  GOOGLE_CALENDAR_TYPE,
  OFFICE_365_CALENDAR_TYPE,
} from "@calcom/platform-constants";

export class DestinationCalendarsInputBodyDto {
  @IsString()
  @Expose()
  @ApiProperty({
    example: APPLE_CALENDAR_TYPE,
    description: "The calendar service you want to integrate, as returned by the /calendars endpoint",
    enum: [APPLE_CALENDAR_TYPE, GOOGLE_CALENDAR_TYPE, OFFICE_365_CALENDAR_TYPE],
    required: true,
  })
  @IsEnum([APPLE_CALENDAR_TYPE, GOOGLE_CALENDAR_TYPE, OFFICE_365_CALENDAR_TYPE])
  readonly integration!:
    | typeof APPLE_CALENDAR_TYPE
    | typeof GOOGLE_CALENDAR_TYPE
    | typeof OFFICE_365_CALENDAR_TYPE;

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
