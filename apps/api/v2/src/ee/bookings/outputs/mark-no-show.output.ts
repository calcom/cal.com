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

class HandleMarkNoShowData {
  @IsString()
  message!: string;

  @IsBoolean()
  @IsOptional()
  noShowHost?: boolean;

  @IsString()
  @IsOptional()
  messageKey?: string;

  @ValidateNested()
  @Type(() => Attendee)
  @IsArray()
  @IsOptional()
  attendees?: Attendee[];
}

export class MarkNoShowOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: HandleMarkNoShowData,
  })
  @ValidateNested()
  @Type(() => HandleMarkNoShowData)
  data!: HandleMarkNoShowData;
}
