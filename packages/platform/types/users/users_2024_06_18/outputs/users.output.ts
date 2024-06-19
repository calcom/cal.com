import { IsBoolean, IsDateString, IsInt, IsString } from "class-validator";

export class GetUsersOutput_2024_06_18 {
  @IsInt()
  id!: number;

  @IsString()
  username!: string | null;

  @IsString()
  name!: string | null;

  @IsString()
  email!: string;

  @IsDateString()
  emailVerified!: string | null;

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
  allowDynamicBooking!: boolean;

  @IsDateString()
  createdDate!: string;

  @IsBoolean()
  verified!: boolean | null;

  @IsInt()
  invitedTo!: number | null;

  @IsString()
  role!: string;
}
