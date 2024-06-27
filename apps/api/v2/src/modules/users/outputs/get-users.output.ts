import { Type } from "class-transformer";
import { Expose } from "class-transformer";
import { IsBoolean, IsDateString, IsInt, IsString, ValidateNested, IsArray } from "class-validator";

export class GetUserOutput {
  @IsInt()
  @Expose()
  id!: number;

  @IsString()
  @Expose()
  username!: string | null;

  @IsString()
  @Expose()
  name!: string | null;

  @IsString()
  @Expose()
  email!: string;

  @IsDateString()
  @Expose()
  emailVerified!: Date | null;

  @IsString()
  @Expose()
  bio!: string | null;

  @IsString()
  @Expose()
  avatarUrl!: string | null;

  @IsString()
  @Expose()
  timeZone!: string;

  @IsString()
  @Expose()
  weekStart!: string;

  @IsString()
  @Expose()
  appTheme!: string | null;

  @IsString()
  @Expose()
  theme!: string | null;

  @IsInt()
  @Expose()
  defaultScheduleId!: number | null;

  @IsString()
  @Expose()
  locale!: string | null;

  @IsInt()
  @Expose()
  timeFormat!: number | null;

  @IsBoolean()
  @Expose()
  hideBranding!: boolean;

  @IsString()
  @Expose()
  brandColor!: string | null;

  @IsString()
  @Expose()
  darkBrandColor!: string | null;

  @IsBoolean()
  @Expose()
  allowDynamicBooking!: boolean | null;

  @IsDateString()
  @Expose()
  createdDate!: Date;

  @IsBoolean()
  @Expose()
  verified!: boolean | null;

  @IsInt()
  @Expose()
  invitedTo!: number | null;
}

export class GetUsersOutput {
  @ValidateNested()
  @Type(() => GetUserOutput)
  @IsArray()
  users!: GetUserOutput[];
}
