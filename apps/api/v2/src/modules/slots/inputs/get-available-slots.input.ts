import { IsArray, IsBoolean, IsDateString, IsNumber, IsOptional, IsString } from "class-validator";

export class GetAvailableSlotsInput {
  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @IsNumber()
  @IsOptional()
  eventTypeId?: number;

  @IsArray()
  @IsString({ each: true })
  usernameList?: string[];

  @IsBoolean()
  @IsOptional()
  debug?: boolean;

  @IsNumber()
  @IsOptional()
  duration?: number;
}
