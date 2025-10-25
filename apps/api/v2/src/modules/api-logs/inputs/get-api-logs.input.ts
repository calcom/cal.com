import { IsOptional, IsString, IsNumber, IsBoolean, IsDateString } from "class-validator";
import { Type } from "class-transformer";

export class GetApiLogsInput {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  statusCode?: number;

  @IsOptional()
  @IsString()
  endpoint?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isError?: boolean;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  perPage?: number = 50;
}
