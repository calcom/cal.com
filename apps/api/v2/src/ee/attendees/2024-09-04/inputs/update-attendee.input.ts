import { ApiPropertyOptional } from "@nestjs/swagger";
import { ApiProperty as DocsProperty } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, IsTimeZone } from "class-validator";

export class UpdateAttendeeInput_2024_09_04 {
  @IsOptional()
  @IsEmail()
  @ApiPropertyOptional({
    description: "Email address of the attendee",
    example: "attendee@example.com",
  })
  @DocsProperty()
  email?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: "Full name of the attendee",
    example: "John Doe",
  })
  @DocsProperty()
  name?: string;

  @IsOptional()
  @IsTimeZone()
  @ApiPropertyOptional({
    description: "Timezone of the attendee",
    example: "America/New_York",
  })
  @DocsProperty()
  timeZone?: string;
}
