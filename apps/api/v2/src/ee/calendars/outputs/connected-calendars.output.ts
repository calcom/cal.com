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
  appData!: object | null;

  @IsString()
  dirName!: string;

  @IsString()
  __template!: string;

  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsBoolean()
  installed!: boolean;

  @IsString()
  type!: string;

  @IsString()
  title!: string;

  @IsString()
  variant!: string;

  @IsString()
  category!: string;

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
  integration!: string;

  @IsEmail()
  name!: string;

  @IsBoolean()
  primary!: boolean;

  @IsBoolean()
  readOnly!: boolean;

  @IsEmail()
  email!: string;

  @IsBoolean()
  isSelected!: boolean;

  @IsInt()
  credentialId!: number;
}

class Calendar {
  @IsEmail()
  externalId!: string;

  @IsString()
  integration!: string;

  @IsEmail()
  name!: string;

  @IsOptional()
  @IsBoolean()
  primary?: boolean;

  @IsBoolean()
  readOnly!: boolean;

  @IsEmail()
  email!: string;

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
  primary!: Primary;

  @ValidateNested({ each: true })
  @IsArray()
  calendars!: Calendar[];
}

class DestinationCalendar {
  @IsInt()
  id!: number;

  @IsString()
  integration!: string;

  @IsEmail()
  externalId!: string;

  @IsEmail()
  primaryEmail!: string;

  @IsInt()
  userId!: number;

  @IsOptional()
  @IsInt()
  eventTypeId!: number | null;

  @IsInt()
  credentialId!: number;

  @IsString()
  name!: string;

  @IsBoolean()
  primary!: boolean;

  @IsBoolean()
  readOnly!: boolean;

  @IsEmail()
  email!: string;

  @IsString()
  integrationTitle!: string;
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
