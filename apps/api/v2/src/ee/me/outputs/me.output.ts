import { Type } from "class-transformer";
import { IsInt, IsEmail, IsOptional, IsString, ValidateNested } from "class-validator";

export class MeOrgOutput {
  isPlatform!: boolean;

  id!: number;
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

  @IsInt()
  organizationId!: number | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => MeOrgOutput)
  organization?: MeOrgOutput;
}
