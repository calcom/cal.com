import { IsInt, IsEmail, IsOptional, IsString } from "class-validator";

export class MeOutput {
  @IsInt()
  id!: number;

  @IsString()
  username!: string;

  @IsEmail()
  email!: string;

  @IsInt()
  timeFormat!: number;

  @IsInt()
  @IsOptional()
  defaultScheduleId!: number | null;

  @IsString()
  weekStart!: string;

  @IsString()
  timeZone!: string;
}
