import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, IsUrl, Length } from "class-validator";

export class UpdateTeamDto {
  @IsString()
  @Length(1)
  @ApiPropertyOptional({ description: "Name of the team", example: "CalTeam" })
  readonly name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: String, description: "Team slug", example: "caltel" })
  readonly slug?: string;

  @IsOptional()
  @IsUrl()
  @ApiPropertyOptional({
    type: String,
    example: "https://i.cal.com/api/avatar/b0b58752-68ad-4c0d-8024-4fa382a77752.png",
    description: `URL of the teams logo image`,
  })
  readonly logoUrl?: string;

  @IsOptional()
  @IsUrl()
  @ApiPropertyOptional()
  readonly calVideoLogo?: string;

  @IsOptional()
  @IsUrl()
  @ApiPropertyOptional()
  readonly appLogo?: string;

  @IsOptional()
  @IsUrl()
  @ApiPropertyOptional()
  readonly appIconLogo?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  readonly bio?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  readonly hideBranding?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  readonly isPrivate?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  readonly hideBookATeamMember?: boolean;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  readonly metadata?: string; // Assuming metadata is a JSON string. Adjust accordingly if it's a nested object.

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  readonly theme?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  readonly brandColor?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  readonly darkBrandColor?: string;

  @IsOptional()
  @IsUrl()
  @ApiPropertyOptional({
    type: String,
    example: "https://i.cal.com/api/avatar/949be534-7a88-4185-967c-c020b0c0bef3.png",
    description: `URL of the teams banner image which is shown on booker`,
  })
  readonly bannerUrl?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  readonly timeFormat?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    type: String,
    example: "America/New_York",
    description: `Timezone is used to create teams's default schedule from Monday to Friday from 9AM to 5PM. It will default to Europe/London if not passed.`,
  })
  readonly timeZone?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    type: String,
    example: "Monday",
  })
  readonly weekStart?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  readonly bookingLimits?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  readonly includeManagedEventsInLimits?: boolean;
}
