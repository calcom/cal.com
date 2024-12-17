import { ApiProperty as DocsProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Length } from "class-validator";

export class TeamOutputDto {
  @IsInt()
  @Expose()
  @DocsProperty()
  readonly id!: number;

  @IsInt()
  @IsOptional()
  @Expose()
  @ApiPropertyOptional()
  readonly parentId?: number;

  @IsString()
  @Length(1)
  @Expose()
  @DocsProperty()
  readonly name!: string;

  @IsOptional()
  @IsString()
  @Expose()
  @ApiPropertyOptional()
  readonly slug?: string;

  @IsOptional()
  @IsUrl()
  @Expose()
  @ApiPropertyOptional()
  readonly logoUrl?: string;

  @IsOptional()
  @IsUrl()
  @Expose()
  @ApiPropertyOptional()
  readonly calVideoLogo?: string;

  @IsOptional()
  @IsUrl()
  @Expose()
  @ApiPropertyOptional()
  readonly appLogo?: string;

  @IsOptional()
  @IsUrl()
  @Expose()
  @ApiPropertyOptional()
  readonly appIconLogo?: string;

  @IsOptional()
  @IsString()
  @Expose()
  @ApiPropertyOptional()
  readonly bio?: string;

  @IsOptional()
  @IsBoolean()
  @Expose()
  @ApiPropertyOptional()
  readonly hideBranding?: boolean;

  @IsBoolean()
  @Expose()
  @DocsProperty()
  readonly isOrganization!: boolean;

  @IsOptional()
  @IsBoolean()
  @Expose()
  @ApiPropertyOptional()
  readonly isPrivate?: boolean;

  @IsOptional()
  @IsBoolean()
  @Expose()
  @ApiPropertyOptional()
  readonly hideBookATeamMember?: boolean = false;

  @IsOptional()
  @IsString()
  @Expose()
  @ApiPropertyOptional()
  readonly metadata?: string;

  @IsOptional()
  @IsString()
  @Expose()
  @ApiPropertyOptional()
  readonly theme?: string;

  @IsOptional()
  @IsString()
  @Expose()
  @ApiPropertyOptional()
  readonly brandColor?: string;

  @IsOptional()
  @IsString()
  @Expose()
  @ApiPropertyOptional()
  readonly darkBrandColor?: string;

  @IsOptional()
  @IsUrl()
  @Expose()
  @ApiPropertyOptional()
  readonly bannerUrl?: string;

  @IsOptional()
  @IsString()
  @Expose()
  @ApiPropertyOptional()
  readonly timeFormat?: number;

  @IsOptional()
  @IsString()
  @Expose()
  @ApiPropertyOptional({ type: String, default: "Europe/London" })
  readonly timeZone?: string = "Europe/London";

  @IsOptional()
  @IsString()
  @Expose()
  @ApiPropertyOptional({ type: String, default: "Sunday" })
  readonly weekStart?: string = "Sunday";
}
