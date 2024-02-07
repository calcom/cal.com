import { Type } from "class-transformer";
import { IsNumber, IsString, IsOptional, IsArray, ValidateNested } from "class-validator";

export class Calendar {
  @IsNumber()
  credentialId!: number;

  @IsString()
  externalId!: string;
}

export class GetOverlayCalendarsBusyTimesInput {
  @IsString()
  loggedInUsersTz!: string;

  @IsString()
  @IsOptional()
  dateFrom!: string | null;

  @IsString()
  @IsOptional()
  dateTo!: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Calendar)
  calendarsToLoad!: Calendar[];
}
