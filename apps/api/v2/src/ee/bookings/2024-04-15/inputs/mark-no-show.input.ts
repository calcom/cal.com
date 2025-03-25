import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsArray, IsEmail, IsBoolean, ValidateNested } from "class-validator";

class Attendee {
  @IsEmail()
  @ApiProperty()
  email!: string;

  @IsBoolean()
  @ApiProperty()
  noShow!: boolean;
}

export class MarkNoShowInput_2024_04_15 {
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  noShowHost?: boolean;

  @ValidateNested()
  @Type(() => Attendee)
  @IsArray()
  @IsOptional()
  @ApiPropertyOptional({ type: [Attendee] })
  attendees?: Attendee[];
}
