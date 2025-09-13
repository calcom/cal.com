import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

class SessionParticipantItem {
  @ApiProperty({ example: "8" })
  @IsString()
  user_id!: string;

  @ApiProperty({ example: "f269d7f3-afce-4d39-8df6-69d134fe6af7" })
  @IsString()
  participant_id!: string;

  @ApiProperty({ example: "Team Free Example" })
  @IsString()
  user_name!: string;

  @ApiProperty({ example: 1755161937 })
  @IsNumber()
  join_time!: number;

  @ApiProperty({ example: 31 })
  @IsNumber()
  duration!: number;
}

class SessionDetailsItem {
  @ApiProperty({ example: "50455614-55b3-4e66-835d-102f562a5070" })
  @IsString()
  id!: string;

  @ApiProperty({ example: "k6ahwPBbTu2Qr5ZuCvn0" })
  @IsString()
  room!: string;

  @ApiProperty({ example: 1755161937 })
  @IsNumber()
  start_time!: number;

  @ApiProperty({ example: 31 })
  @IsNumber()
  duration!: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  ongoing!: boolean;

  @ApiProperty({ example: 1 })
  @IsNumber()
  max_participants!: number;

  @ApiProperty({ type: [SessionParticipantItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionParticipantItem)
  participants!: SessionParticipantItem[];
}

class SessionDetailsDataWrapper {
  @ApiProperty({ type: [SessionDetailsItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionDetailsItem)
  data!: SessionDetailsItem[];
}

export class GetBookingSessionDetailsOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @IsOptional()
  error?: Error;

  @ApiProperty({ type: SessionDetailsDataWrapper })
  @ValidateNested()
  @Type(() => SessionDetailsDataWrapper)
  data!: SessionDetailsDataWrapper;
}
