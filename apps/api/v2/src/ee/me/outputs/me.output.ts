import { IsInt, IsEmail, IsOptional, IsArray, IsString } from "class-validator";

class Team {
  @IsInt()
  readonly teamId!: number;
}

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

  @IsArray()
  teams!: Team[];
}
