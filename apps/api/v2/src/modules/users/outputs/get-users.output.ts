import { Type } from "class-transformer";
import { IsBoolean, IsDateString, IsInt, IsString, ValidateNested, IsArray } from "class-validator";

export class GetUserOutput {
  @IsInt()
  id!: number;

  @IsString()
  username!: string | null;

  @IsString()
  name!: string | null;

  @IsString()
  email!: string;

  @IsDateString()
  emailVerified!: Date | null;

  @IsString()
  bio!: string | null;

  @IsString()
  avatar!: string | null;

  @IsString()
  timeZone!: string;

  @IsString()
  weekStart!: string;

  @IsString()
  appTheme!: string | null;

  @IsString()
  theme!: string | null;

  @IsInt()
  defaultScheduleId!: number | null;

  @IsString()
  locale!: string | null;

  @IsInt()
  timeFormat!: number | null;

  @IsBoolean()
  hideBranding!: boolean;

  @IsString()
  brandColor!: string | null;

  @IsString()
  darkBrandColor!: string | null;

  @IsBoolean()
  allowDynamicBooking!: boolean | null;

  @IsDateString()
  createdDate!: Date;

  @IsBoolean()
  verified!: boolean | null;

  @IsInt()
  invitedTo!: number | null;

  @IsString()
  role!: string;
}

export class GetUsersOutput {
  @ValidateNested()
  @Type(() => GetUserOutput)
  @IsArray()
  users!: GetUsersOutput[];
}
