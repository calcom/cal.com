import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
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

class Integration {
  @IsOptional()
  @IsObject()
  @ApiPropertyOptional({ type: Object, nullable: true })
  appData?: object | null;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  dirName?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  __template?: string;

  @IsString()
  @ApiProperty()
  name!: string;

  @IsString()
  @ApiProperty()
  description!: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  installed?: boolean;

  @IsString()
  @ApiProperty()
  type!: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  title?: string;

  @IsString()
  @ApiProperty()
  variant!: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  category?: string;

  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ type: [String] })
  categories!: string[];

  @IsString()
  @ApiProperty()
  logo!: string;

  @IsString()
  @ApiProperty()
  publisher!: string;

  @IsString()
  @ApiProperty()
  slug!: string;

  @IsUrl()
  @ApiProperty()
  url!: string;

  @IsEmail()
  @ApiProperty()
  email!: string;

  @IsObject()
  @ApiProperty({ type: Object, nullable: true })
  locationOption!: object | null;
}

class Primary {
  @IsEmail()
  @ApiProperty()
  externalId!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  integration?: string;

  @IsOptional()
  @IsEmail()
  @ApiPropertyOptional()
  name?: string;

  @IsBoolean()
  @ApiProperty({ type: Boolean, nullable: true })
  primary!: boolean | null;

  @IsBoolean()
  @ApiProperty()
  readOnly!: boolean;

  @IsEmail()
  @IsOptional()
  @ApiPropertyOptional()
  email?: string;

  @IsBoolean()
  @ApiProperty()
  isSelected!: boolean;

  @IsInt()
  @ApiProperty()
  credentialId!: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, nullable: true })
  delegationCredentialId?: string | null;
}

export class Calendar {
  @IsEmail()
  @ApiProperty()
  externalId!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  integration?: string;

  @IsEmail()
  @IsOptional()
  @ApiPropertyOptional()
  name?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean, nullable: true })
  primary?: boolean | null;

  @IsBoolean()
  @ApiProperty()
  readOnly!: boolean;

  @IsEmail()
  @IsOptional()
  @ApiPropertyOptional()
  email?: string;

  @IsBoolean()
  @ApiProperty()
  isSelected!: boolean;

  @IsInt()
  @ApiProperty()
  credentialId!: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, nullable: true })
  delegationCredentialId?: string | null;
}

export class ConnectedCalendar {
  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: Integration })
  integration!: Integration;

  @IsInt()
  @ApiProperty()
  credentialId!: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, nullable: true })
  delegationCredentialId?: string | null;

  @ValidateNested()
  @IsObject()
  @IsOptional()
  @ApiPropertyOptional({ type: Primary })
  primary?: Primary;

  @ValidateNested({ each: true })
  @IsArray()
  @IsOptional()
  @ApiPropertyOptional({ type: [Calendar] })
  calendars?: Calendar[];
}

class DestinationCalendar {
  @IsInt()
  @ApiProperty()
  id!: number | string;

  @IsString()
  @ApiProperty()
  integration!: string;

  @IsEmail()
  @ApiProperty()
  externalId!: string;

  @IsEmail()
  @ApiProperty({ type: String, nullable: true })
  primaryEmail!: string | null;

  @IsInt()
  @ApiProperty({ nullable: true })
  userId!: number | null;

  @IsOptional()
  @IsInt()
  @ApiProperty({ type: Number, nullable: true })
  eventTypeId!: number | null;

  @IsInt()
  @ApiProperty({ type: Number, nullable: true })
  credentialId!: number | null;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, nullable: true })
  delegationCredentialId?: string | null;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, nullable: true })
  name?: string | null;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  primary?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  readOnly?: boolean;

  @IsEmail()
  @IsOptional()
  @ApiPropertyOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  integrationTitle?: string;
}

export class ConnectedCalendarsData {
  @ValidateNested({ each: true })
  @IsArray()
  @ApiProperty({ type: [ConnectedCalendar] })
  connectedCalendars!: ConnectedCalendar[];

  @ValidateNested()
  @IsObject()
  @ApiProperty({ type: DestinationCalendar })
  destinationCalendar!: DestinationCalendar;
}

export class ConnectedCalendarsOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ValidateNested()
  @Type(() => ConnectedCalendarsData)
  @ApiProperty({ type: ConnectedCalendarsData })
  data!: ConnectedCalendarsData;
}
