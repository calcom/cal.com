import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class CalendarLinks {
  @ApiProperty({
    description: "Google Calendar add event URL",
    example:
      "https://calendar.google.com/calendar/r/eventedit?dates=20240630T090000Z/20240630T100000Z&text=Meeting%20with%20John%20Doe",
  })
  googleCalendar!: string;

  @ApiProperty({
    description: "Microsoft Office 365 add event URL",
    example:
      "https://outlook.office.com/calendar/0/deeplink/compose?body=Meeting%20details&enddt=2024-06-30T10:00:00Z&path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&startdt=2024-06-30T09:00:00Z&subject=Meeting%20with%20John%20Doe",
  })
  office365!: string;

  @ApiProperty({
    description: "ICS file data URL (data:text/calendar)",
    example:
      "data:text/calendar,BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//hacksw/handcal//NONSGML v1.0//EN\nBEGIN:VEVENT\nUID:123\nDTSTART:20240630T090000Z\nDTEND:20240630T100000Z\nSUMMARY:Meeting with John Doe\nEND:VEVENT\nEND:VCALENDAR",
  })
  ics!: string;
}

export class CalendarLinksOutput_2024_08_13 {
  @ApiProperty({
    description: "The status of the request, always 'success' for successful responses",
    example: SUCCESS_STATUS,
  })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    description: "Calendar links for the booking",
    type: CalendarLinks,
  })
  data!: CalendarLinks;
}
