import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { string } from "zod";

export class GetBusyEventsQueryParams {
  // dateFrom, dateTo, username and event slug (edited)
  @IsString()
  @ApiProperty({
    type: string,
  })
  dateFrom!: string;

  @IsString()
  @ApiProperty({
    type: string,
  })
  dateTo!: string;

  @IsString()
  @ApiProperty({
    type: string,
  })
  username!: string;

  @IsString()
  @ApiProperty({
    type: string,
  })
  eventSlug!: string;
}
