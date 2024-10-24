import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsInt } from "class-validator";

export class DeleteCalendarCredentialsInputBodyDto {
  @IsInt()
  @Expose()
  @ApiProperty({
    example: 10,
    description: "Credential ID of the calendar to delete, as returned by the /calendars endpoint",
    type: "integer",
    required: true,
  })
  readonly id!: number;
}
