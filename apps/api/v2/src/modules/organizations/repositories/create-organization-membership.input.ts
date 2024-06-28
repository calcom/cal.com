import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Min } from "class-validator";

export class CreateOrgMembershipDto {
  @IsOptional()
  @IsInt()
  readonly id?: number;

  @IsString()
  @Min(1)
  readonly name!: string;

  @IsOptional()
  @IsString()
  @Min(1)
  readonly slug?: string;

  @IsOptional()
  @IsUrl()
  readonly logoUrl?: string;

  @IsOptional()
  @IsUrl()
  readonly calVideoLogo?: string;

  @IsOptional()
  @IsUrl()
  readonly appLogo?: string;

  @IsOptional()
  @IsUrl()
  readonly appIconLogo?: string;

  @IsOptional()
  @IsString()
  readonly bio?: string;

  @IsOptional()
  @IsBoolean()
  readonly hideBranding?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly isPrivate?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly hideBookATeamMember?: boolean;

  @IsOptional()
  @IsString()
  readonly metadata?: string; // Assuming metadata is a JSON string. Adjust accordingly if it's a nested object.

  @IsOptional()
  @IsString()
  readonly theme?: string;

  @IsOptional()
  @IsString()
  readonly brandColor?: string;

  @IsOptional()
  @IsString()
  readonly darkBrandColor?: string;

  @IsOptional()
  @IsUrl()
  readonly bannerUrl?: string;

  @IsOptional()
  @IsString()
  readonly timeFormat?: number;

  @IsOptional()
  @IsString()
  readonly timeZone?: string = "Europe/London";

  @IsOptional()
  @IsString()
  readonly weekStart?: string = "Sunday";
}
