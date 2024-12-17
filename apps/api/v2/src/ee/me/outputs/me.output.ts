import { ApiProperty as DocsProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsOptional, IsInt, IsEmail, ValidateNested } from "class-validator";

export class MeOrgOutput {
  @DocsProperty()
  isPlatform!: boolean;

  @DocsProperty()
  id!: number;
}

export class MeOutput {
  @IsInt()
  @DocsProperty()
  id!: number;

  @IsString()
  @DocsProperty()
  username!: string;

  @IsEmail()
  @DocsProperty()
  email!: string;

  @IsInt()
  @DocsProperty()
  timeFormat!: number;

  @IsInt()
  @DocsProperty({ type: Number, nullable: true })
  defaultScheduleId!: number | null;

  @IsString()
  @DocsProperty()
  weekStart!: string;

  @IsString()
  @DocsProperty()
  timeZone!: string;

  @IsInt()
  @DocsProperty({ type: Number, nullable: true })
  organizationId!: number | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => MeOrgOutput)
  @ApiPropertyOptional({ type: MeOrgOutput })
  organization?: MeOrgOutput;
}
