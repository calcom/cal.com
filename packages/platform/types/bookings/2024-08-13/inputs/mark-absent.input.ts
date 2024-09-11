import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsBoolean, IsEmail, IsArray, ArrayMinSize, ValidateNested } from "class-validator";

class Attendee {
  @IsEmail()
  @ApiProperty()
  email!: string;

  @IsBoolean()
  @ApiProperty()
  absent!: boolean;
}

export class MarkAbsentBookingInput_2024_08_13 {
  @IsBoolean()
  @IsOptional()
  @ApiProperty({ example: false, required: false, description: "Whether the host was absent" })
  host?: boolean;

  @ArrayMinSize(1)
  @ApiProperty({
    type: [String],
    description: "Toggle whether an attendee was absent or not.",
    example: [{ absent: true, email: "someone@gmail.com" }],
  })
  @ValidateNested()
  @Type(() => Attendee)
  @IsArray()
  @IsOptional()
  attendees?: Attendee[];
}
