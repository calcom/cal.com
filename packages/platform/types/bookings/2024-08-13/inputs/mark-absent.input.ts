import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsBoolean, IsEmail, IsArray, ArrayMinSize } from "class-validator";

export class MarkAbsentBookingInput_2024_08_13 {
  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  host?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @IsEmail({}, { each: true })
  @IsOptional()
  @ApiProperty({ type: [String] })
  attendees?: string[];
}
