import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsEnum, IsOptional, ValidateNested, IsArray, IsEmail, IsBoolean } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

class Attendee {
  @IsEmail()
  email!: string;

  @IsBoolean()
  noShow!: boolean;
}

class HandleMarkNoShowData_2024_04_15 {
  @IsString()
  message!: string;

  @IsBoolean()
  @IsOptional()
  noShowHost?: boolean;

  @ValidateNested()
  @Type(() => Attendee)
  @IsArray()
  @IsOptional()
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
