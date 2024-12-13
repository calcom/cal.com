import { Expose } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Length } from "class-validator";

export class OrgTeamOutputDto {
  @IsInt()
  @Expose()
  readonly id!: number;

  @IsInt()
  @IsOptional()
  @Expose()
  readonly parentId?: number;

  @IsString()
  @Length(1)
  @Expose()
  readonly name!: string;

  @IsOptional()
  @IsString()
  @Expose()
  readonly slug?: string;

  @IsOptional()
  @IsUrl()
  @Expose()
  readonly logoUrl?: string;

  @IsOptional()
  @IsUrl()
  @Expose()
  readonly calVideoLogo?: string;

  @IsOptional()
  @IsUrl()
  @Expose()
  readonly appLogo?: string;

  @IsOptional()
  @IsUrl()
  @Expose()
  readonly appIconLogo?: string;

  @IsOptional()
  @IsString()
  @Expose()
  readonly bio?: string;

  @IsOptional()
  @IsBoolean()
  @Expose()
  readonly hideBranding?: boolean;

  @IsBoolean()
  @Expose()
  readonly isOrganization?: boolean;

  @IsOptional()
  @IsBoolean()
  @Expose()
  readonly isPrivate?: boolean;

  @IsOptional()
  @IsBoolean()
  @Expose()
  readonly hideBookATeamMember?: boolean = false;

  @IsOptional()
  @IsString()
  @Expose()
  readonly metadata?: string;

  @IsOptional()
  @IsString()
  @Expose()
  readonly theme?: string;

  @IsOptional()
  @IsString()
  @Expose()
  readonly brandColor?: string;

  @IsOptional()
  @IsString()
  @Expose()
  readonly darkBrandColor?: string;

  @IsOptional()
  @IsUrl()
  @Expose()
  readonly bannerUrl?: string;

  @IsOptional()
  @IsString()
  @Expose()
  readonly timeFormat?: number;

  @IsOptional()
  @IsString()
  @Expose()
  readonly timeZone?: string = "Europe/London";

  @IsOptional()
  @IsString()
  @Expose()
  readonly weekStart?: string = "Sunday";
}
