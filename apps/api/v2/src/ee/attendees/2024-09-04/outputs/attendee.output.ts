import { ApiProperty } from "@nestjs/swagger";
import { ApiProperty as DocsProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsEnum, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class AttendeeOutput_2024_09_04 {
  @ApiProperty({
    description: "Unique identifier for the attendee",
    example: 456,
  })
  @DocsProperty()
  @Expose()
  id!: number;

  @ApiProperty({
    description: "The ID of the booking this attendee belongs to",
    example: 123,
  })
  @DocsProperty()
  @Expose()
  bookingId!: number;

  @ApiProperty({
    description: "Email address of the attendee",
    example: "attendee@example.com",
  })
  @DocsProperty()
  @Expose()
  email!: string;

  @ApiProperty({
    description: "Full name of the attendee",
    example: "John Doe",
  })
  @DocsProperty()
  @Expose()
  name!: string;

  @ApiProperty({
    description: "Timezone of the attendee",
    example: "America/New_York",
  })
  @DocsProperty()
  @Expose()
  timeZone!: string;
}

export class CreateAttendeeOutput_2024_09_04 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    description: "The created attendee",
    type: AttendeeOutput_2024_09_04,
  })
  @ValidateNested()
  @Type(() => AttendeeOutput_2024_09_04)
  data!: AttendeeOutput_2024_09_04;
}

export class UpdateAttendeeOutput_2024_09_04 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    description: "The updated attendee",
    type: AttendeeOutput_2024_09_04,
  })
  @ValidateNested()
  @Type(() => AttendeeOutput_2024_09_04)
  data!: AttendeeOutput_2024_09_04;
}

export class GetAttendeeOutput_2024_09_04 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    description: "The attendee",
    type: AttendeeOutput_2024_09_04,
  })
  @ValidateNested()
  @Type(() => AttendeeOutput_2024_09_04)
  data!: AttendeeOutput_2024_09_04;
}

export class DeleteAttendeeOutput_2024_09_04 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    description: "The deleted attendee",
    type: AttendeeOutput_2024_09_04,
  })
  @ValidateNested()
  @Type(() => AttendeeOutput_2024_09_04)
  data!: AttendeeOutput_2024_09_04;
}
