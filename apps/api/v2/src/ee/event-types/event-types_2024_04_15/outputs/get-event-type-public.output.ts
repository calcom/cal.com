import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from "class-validator";

class Location {
  @IsString()
  @ApiProperty()
  type!: string;
}

class Source {
  @IsString()
  @ApiProperty()
  id!: string;

  @IsString()
  @ApiProperty()
  type!: string;

  @IsString()
  @ApiProperty()
  label!: string;
}

class OptionInput {
  @IsString()
  @ApiProperty()
  type!: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  required?: boolean;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  placeholder?: string;
}

class BookingField {
  @IsString()
  @ApiProperty()
  name!: string;

  @IsString()
  @ApiProperty()
  type!: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  defaultLabel?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  label?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  placeholder?: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  required?: boolean;

  @IsOptional()
  @ApiPropertyOptional()
  getOptionsAt?: string;

  @IsObject()
  @IsOptional()
  @ApiPropertyOptional()
  optionsInputs?: { [key: string]: OptionInput };

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  hideWhenJustOneOption?: boolean;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  editable?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Source)
  @IsOptional()
  @ApiPropertyOptional({ type: [Source] })
  sources?: Source[];

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  disableOnPrefill?: boolean;
}

class Organization {
  @IsInt()
  @ApiProperty()
  id!: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, nullable: true })
  slug?: string | null;

  @IsString()
  @ApiProperty()
  name!: string;

  @IsOptional()
  @ApiPropertyOptional({ type: Object })
  metadata?: Record<string, any>;
}

class Profile {
  @IsString()
  @ApiProperty({ type: String, nullable: true })
  username!: string | null;

  @IsInt()
  @ApiProperty({ type: Number, nullable: true })
  id!: number | null;

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional()
  userId?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  uid?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  name?: string;

  @IsInt()
  @ApiProperty({ type: Number, nullable: true })
  organizationId!: number | null;

  @ValidateNested()
  @Type(() => Organization)
  @ApiPropertyOptional({ type: Organization, nullable: true })
  organization?: Organization | null;

  @IsString()
  @ApiProperty()
  upId!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  image?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  brandColor?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  darkBrandColor?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  theme?: string;

  @IsOptional()
  @ApiPropertyOptional()
  bookerLayouts?: any;
}

class Owner {
  @IsInt()
  @ApiProperty()
  id!: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, nullable: true })
  avatarUrl?: string | null;

  @IsString()
  @ApiProperty({ type: String, nullable: true })
  username!: string | null;

  @IsString()
  @ApiProperty({ type: String, nullable: true })
  name!: string | null;

  @IsString()
  @ApiProperty()
  weekStart!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, nullable: true })
  brandColor?: string | null;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, nullable: true })
  darkBrandColor?: string | null;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, nullable: true })
  theme?: string | null;

  @IsOptional()
  @ApiPropertyOptional()
  metadata?: any;

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({ type: Number, nullable: true })
  defaultScheduleId?: number | null;

  @IsString()
  @ApiProperty({ type: String, nullable: true })
  nonProfileUsername!: string | null;

  @ValidateNested()
  @Type(() => Profile)
  @ApiProperty({ type: Profile })
  profile!: Profile;
}

class User {
  @IsString()
  @ApiProperty({ type: String, nullable: true })
  username!: string | null;

  @IsString()
  @ApiProperty({ type: String, nullable: true })
  name!: string | null;

  @IsString()
  @ApiProperty()
  weekStart!: string;

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional()
  organizationId?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, nullable: true })
  avatarUrl?: string | null;

  @ValidateNested()
  @ApiProperty({ type: Profile })
  profile!: Profile;

  @IsString()
  @ApiProperty()
  bookerUrl!: string;
}

class Schedule {
  @IsInt()
  @ApiProperty()
  id!: number;

  @IsString()
  @ApiProperty({ type: String, nullable: true })
  timeZone!: string | null;
}

class PublicEventTypeOutput {
  @IsInt()
  @ApiProperty()
  id!: number;

  @IsString()
  @ApiProperty()
  title!: string;

  @IsString()
  @ApiProperty()
  description!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ type: String, nullable: true })
  eventName?: string | null;

  @IsString()
  @ApiProperty()
  slug!: string;

  @IsBoolean()
  @ApiProperty()
  isInstantEvent!: boolean;

  @IsOptional()
  @ApiPropertyOptional()
  aiPhoneCallConfig?: any;

  @IsOptional()
  @ApiPropertyOptional()
  schedulingType?: any;

  @IsInt()
  @ApiProperty()
  length!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Location)
  @ApiProperty({ type: [Location] })
  locations!: Location[];

  @IsArray()
  @ApiProperty({ type: [Object] })
  customInputs!: any[];

  @IsBoolean()
  @ApiProperty()
  disableGuests!: boolean;

  @IsObject()
  @ApiProperty({ type: Object, nullable: true })
  metadata!: object | null;

  @IsBoolean()
  @ApiProperty()
  lockTimeZoneToggleOnBookingPage!: boolean;

  @IsBoolean()
  @ApiProperty()
  requiresConfirmation!: boolean;

  @IsBoolean()
  @ApiProperty()
  requiresBookerEmailVerification!: boolean;

  @IsOptional()
  @ApiPropertyOptional()
  recurringEvent?: any;

  @IsNumber()
  @ApiProperty()
  price!: number;

  @IsString()
  @ApiProperty()
  currency!: string;

  @IsOptional()
  @ApiPropertyOptional({ type: Number, nullable: true })
  seatsPerTimeSlot?: number | null;

  @IsBoolean()
  @ApiProperty({ type: Boolean, nullable: true })
  seatsShowAvailabilityCount!: boolean | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingField)
  @ApiProperty({ type: [BookingField] })
  bookingFields!: BookingField[];

  @IsOptional()
  @ApiPropertyOptional()
  team?: any;

  @IsOptional()
  @IsUrl()
  @ApiPropertyOptional({ type: String, nullable: true })
  successRedirectUrl?: string | null;

  @IsArray()
  @ApiProperty()
  workflows!: any[];

  @IsArray()
  @ApiPropertyOptional()
  hosts?: any[];

  @ValidateNested()
  @Type(() => Owner)
  @ApiProperty({ type: Owner, nullable: true })
  owner!: Owner | null;

  @ValidateNested()
  @Type(() => Schedule)
  @ApiProperty({ type: Schedule, nullable: true })
  schedule!: Schedule | null;

  @IsBoolean()
  @ApiProperty()
  hidden!: boolean;

  @IsBoolean()
  @ApiProperty()
  assignAllTeamMembers!: boolean;

  @IsOptional()
  @ApiPropertyOptional()
  bookerLayouts?: any;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => User)
  @ApiPropertyOptional({ type: [User] })
  users?: User[];

  @IsObject()
  @ApiProperty({ type: Object })
  entity!: object;

  @IsBoolean()
  isDynamic!: boolean;
}

export class GetEventTypePublicOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ValidateNested({ each: true })
  @Type(() => PublicEventTypeOutput)
  @IsArray()
  data!: PublicEventTypeOutput | null;
}
