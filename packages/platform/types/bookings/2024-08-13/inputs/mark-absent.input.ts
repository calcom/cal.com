import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsBoolean, IsEmail, IsArray, ArrayMinSize, ValidateNested } from "class-validator";

class Attendee {
  @IsEmail()
  email!: string;

  @IsBoolean()
  absent!: boolean;
}

export class MarkAbsentBookingInput_2024_08_13 {
  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  host?: boolean;

  @ArrayMinSize(1)
  @ApiProperty({ type: [String] })
  @ValidateNested()
  @Type(() => Attendee)
  @IsArray()
  @IsOptional()
  attendees?: Attendee[];
}
