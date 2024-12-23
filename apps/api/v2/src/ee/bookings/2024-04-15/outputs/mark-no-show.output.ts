import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsEnum, IsOptional, ValidateNested, IsArray, IsEmail, IsBoolean } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

class Attendee {
  @IsEmail()
  @ApiProperty()
  email!: string;

  @IsBoolean()
  @ApiProperty()
  noShow!: boolean;
}

class HandleMarkNoShowData_2024_04_15 {
  @IsString()
  @ApiProperty()
  message!: string;

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

export class MarkNoShowOutput_2024_04_15 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: HandleMarkNoShowData_2024_04_15,
  })
  @ValidateNested()
  @Type(() => HandleMarkNoShowData_2024_04_15)
  data!: HandleMarkNoShowData_2024_04_15;
}
