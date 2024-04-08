import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

class Integration {
  @IsOptional()
  @IsObject()
  appData?: object | null;

  @IsOptional()
  @IsString()
  dirName?: string;

  @IsOptional()
  @IsString()
  __template?: string;

  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsBoolean()
  installed?: boolean;

  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  variant!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsArray()
  @IsString({ each: true })
  categories!: string[];

  @IsString()
  logo!: string;

  @IsString()
  publisher!: string;

  @IsString()
  slug!: string;

  @IsUrl()
  url!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsObject()
  locationOption!: object | null;
}

class Primary {
  @IsEmail()
  externalId!: string;

  @IsString()
  @IsOptional()
  integration?: string;

  @IsOptional()
  @IsEmail()
  name?: string;

  @IsBoolean()
  primary!: boolean | null;

  @IsBoolean()
  readOnly!: boolean;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsBoolean()
  isSelected!: boolean;

  @IsInt()
  credentialId!: number;
}

class Calendar {
  @IsEmail()
  externalId!: string;

  @IsString()
  @IsOptional()
  integration?: string;

  @IsEmail()
  @IsOptional()
  name?: string;

  @IsOptional()
  @IsBoolean()
  primary?: boolean | null;

  @IsBoolean()
  readOnly!: boolean;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsBoolean()
  isSelected!: boolean;

  @IsInt()
  credentialId!: number;
}

class ConnectedCalendar {
  @ValidateNested()
  @IsObject()
  integration!: Integration;

  @IsInt()
  credentialId!: number;

  @ValidateNested()
  @IsObject()
  @IsOptional()
  primary?: Primary;

  @ValidateNested({ each: true })
  @IsArray()
  @IsOptional()
  calendars?: Calendar[];
}

class DestinationCalendar {
  @IsInt()
  id!: number;

  @IsString()
  integration!: string;

  @IsEmail()
  externalId!: string;

  @IsEmail()
  primaryEmail!: string | null;

  @IsInt()
  userId!: number | null;

  @IsOptional()
  @IsInt()
  eventTypeId!: number | null;

  @IsInt()
  credentialId!: number | null;

  @IsString()
  @IsOptional()
  name?: string | null;

  @IsBoolean()
  @IsOptional()
  primary?: boolean;

  @IsBoolean()
  @IsOptional()
  readOnly?: boolean;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  integrationTitle?: string;
}

class ConnectedCalendarsData {
  @ValidateNested({ each: true })
  @IsArray()
  connectedCalendars!: ConnectedCalendar[];

  @ValidateNested()
  @IsObject()
  destinationCalendar!: DestinationCalendar;
}
export class ConnectedCalendarsOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ValidateNested()
  @Type(() => ConnectedCalendarsData)
  data!: ConnectedCalendarsData;
}
