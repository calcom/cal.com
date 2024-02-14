import {
  IS_ISO8601,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class GetAvailableSlotsInput {
  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @IsNumber()
  @IsOptional()
  eventTypeId?: number;

  @IsArray({ each: true })
  @IsString()
  usernameList?: string[];

  @IsBoolean()
  @IsOptional()
  debug?: boolean;

  @IsNumber()
  @IsOptional()
  duration?: number;

  @IsBoolean()
  isTeamEvent!: boolean;
}
