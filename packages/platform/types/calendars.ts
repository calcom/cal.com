import { Type } from "class-transformer";
import {
  IsNumber,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  Validate,
  IsBoolean,
} from "class-validator";

import { IsYearMonthDays } from "./validators/isYearMonthDays";

export class Calendar {
  @IsNumber()
  credentialId!: number;

  @IsString()
  externalId!: string;
}

export class CalendarBusyTimesInput {
  @IsString()
  loggedInUsersTz!: string;

  @IsString()
  @IsOptional()
  @Validate(IsYearMonthDays)
  dateFrom?: string | null;

  @IsString()
  @IsOptional()
  @Validate(IsYearMonthDays)
  dateTo?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Calendar)
  calendarsToLoad!: Calendar[];
}

export class IntegrationOAuthCallbackState {
  @IsString()
  returnTo!: string;

  @IsString()
  onErrorReturnTo!: string;

  @IsBoolean()
  fromApp!: boolean;

  @IsBoolean()
  @IsOptional()
  installGoogleVideo?: boolean;

  @IsNumber()
  @IsOptional()
  teamId?: number;
}
