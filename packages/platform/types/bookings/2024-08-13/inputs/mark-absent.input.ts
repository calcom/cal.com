import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
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
  @ApiPropertyOptional({ example: false, description: "Whether the host was absent" })
  host?: boolean;

  @ArrayMinSize(1)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Attendee)
  @IsOptional()
  @ApiPropertyOptional({ type: [Attendee] })
  attendees?: Attendee[];
}
