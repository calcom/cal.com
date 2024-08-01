import { IsBoolean, IsOptional, IsString, IsUrl, Length } from "class-validator";

export class CreateOrgTeamDto {
  @IsString()
  @Length(1)
  readonly name!: string;

  @IsOptional()
  @IsString()
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
  readonly hideBranding?: boolean = false;

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

  @IsOptional()
  @IsBoolean()
  readonly autoAcceptCreator?: boolean = true;
}
