import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
  IsArray,
  IsObject,
  IsNumber,
  IsEnum,
} from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

class Location {
  @IsString()
  type!: string;
}

class Source {
  @IsString()
  id!: string;

  @IsString()
  type!: string;

  @IsString()
  label!: string;
}

class OptionInput {
  @IsString()
  type!: string;

  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @IsString()
  @IsOptional()
  placeholder?: string;
}

class BookingField {
  @IsString()
  name!: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  defaultLabel?: string;

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  placeholder?: string;

  @IsBoolean()
  @IsOptional()
  required?: boolean;

  @IsOptional()
  getOptionsAt?: string;

  @IsObject()
  @IsOptional()
  optionsInputs?: { [key: string]: OptionInput };

  @IsBoolean()
  @IsOptional()
  hideWhenJustOneOption?: boolean;

  @IsString()
  @IsOptional()
  editable?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Source)
  @IsOptional()
  sources?: Source[];
}

class Organization {
  @IsInt()
  id!: number;

  @IsString()
  @IsOptional()
  slug?: string | null;

  @IsString()
  name!: string;

  @IsOptional()
  metadata!: Record<string, any>;
}

class Profile {
  @IsString()
  username!: string | null;

  @IsInt()
  id!: number | null;

  @IsInt()
  @IsOptional()
  userId?: number;

  @IsString()
  @IsOptional()
  uid?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsInt()
  organizationId!: number | null;

  @ValidateNested()
  @Type(() => Organization)
  organization?: Organization | null;

  @IsString()
  upId!: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  brandColor?: string;

  @IsString()
  @IsOptional()
  darkBrandColor?: string;

  @IsString()
  @IsOptional()
  theme?: string;

  @IsOptional()
  bookerLayouts?: any;
}

class Owner {
  @IsInt()
  id!: number;

  @IsString()
  @IsOptional()
  avatarUrl?: string | null;

  @IsString()
  username!: string | null;

  @IsString()
  name!: string | null;

  @IsString()
  weekStart!: string;

  @IsString()
  @IsOptional()
  brandColor?: string | null;

  @IsString()
  @IsOptional()
  darkBrandColor?: string | null;

  @IsString()
  @IsOptional()
  theme?: string | null;

  @IsOptional()
  metadata!: any;

  @IsInt()
  @IsOptional()
  defaultScheduleId?: number | null;

  @IsString()
  nonProfileUsername!: string | null;

  @ValidateNested()
  @Type(() => Profile)
  profile!: Profile;
}

class User {
  @IsString()
  username!: string | null;

  @IsString()
  name!: string | null;

  @IsString()
  weekStart!: string;

  @IsInt()
  organizationId?: number;

  @IsString()
  @IsOptional()
  avatarUrl?: string | null;

  @ValidateNested()
  profile!: Profile;

  @IsString()
  bookerUrl!: string;
}

class Schedule {
  @IsInt()
  id!: number;

  @IsString()
  timeZone!: string | null;
}

class PublicEventTypeOutput {
  @IsInt()
  id!: number;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  @IsOptional()
  eventName?: string | null;

  @IsString()
  slug!: string;

  @IsBoolean()
  isInstantEvent!: boolean;

  @IsOptional()
  aiPhoneCallConfig?: any;

  @IsOptional()
  schedulingType?: any;

  @IsInt()
  length!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Location)
  locations!: Location[];

  @IsArray()
  customInputs!: any[];

  @IsBoolean()
  disableGuests!: boolean;

  @IsObject()
  metadata!: object | null;

  @IsBoolean()
  lockTimeZoneToggleOnBookingPage!: boolean;

  @IsBoolean()
  requiresConfirmation!: boolean;

  @IsBoolean()
  requiresBookerEmailVerification!: boolean;

  @IsOptional()
  recurringEvent?: any;

  @IsNumber()
  price!: number;

  @IsString()
  currency!: string;

  @IsOptional()
  seatsPerTimeSlot?: number | null;

  @IsBoolean()
  seatsShowAvailabilityCount!: boolean | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingField)
  bookingFields!: BookingField[];

  @IsOptional()
  team?: any;

  @IsOptional()
  @IsUrl()
  successRedirectUrl?: string | null;

  @IsArray()
  workflows!: any[];

  @IsArray()
  hosts!: any[];

  @ValidateNested()
  @Type(() => Owner)
  owner!: Owner | null;

  @ValidateNested()
  @Type(() => Schedule)
  schedule!: Schedule | null;

  @IsBoolean()
  hidden!: boolean;

  @IsBoolean()
  assignAllTeamMembers!: boolean;

  @IsOptional()
  bookerLayouts?: any;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => User)
  users!: User[];

  @IsObject()
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
