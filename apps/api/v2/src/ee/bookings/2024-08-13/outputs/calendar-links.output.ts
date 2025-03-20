import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsString } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class CalendarLink {
  @IsString()
  @ApiProperty({
    description: "The label of the calendar link",
  })
  label!: string;

  @IsString()
  @ApiProperty({
    description: "The link to the calendar",
  })
  link!: string;
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
    type: [CalendarLink],
  })
  data!: CalendarLink[];
}
