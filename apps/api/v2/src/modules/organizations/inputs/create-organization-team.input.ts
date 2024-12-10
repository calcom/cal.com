import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, IsUrl, Length } from "class-validator";

export class CreateOrgTeamDto {
  @IsString()
  @Length(1)
  @ApiProperty({ description: "Name of the team", example: "CalTeam", required: true })
  readonly name!: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: String, description: "Team slug", example: "caltel", required: false })
  readonly slug?: string;

  @IsOptional()
  @IsUrl()
  @ApiPropertyOptional({
    type: String,
    example: "https://i.cal.com/api/avatar/b0b58752-68ad-4c0d-8024-4fa382a77752.png",
    description: `URL of the teams logo image`,
    required: false,
  })
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
  @ApiPropertyOptional({
    type: String,
    example: "https://i.cal.com/api/avatar/949be534-7a88-4185-967c-c020b0c0bef3.png",
    description: `URL of the teams banner image which is shown on booker`,
    required: false,
  })
  readonly bannerUrl?: string;

  @IsOptional()
  @IsString()
  readonly timeFormat?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    type: String,
    example: "America/New_York",
    description: `Timezone is used to create teams's default schedule from Monday to Friday from 9AM to 5PM. It will default to Europe/London if not passed.`,
    required: false,
    default: "Europe/London",
  })
  readonly timeZone?: string = "Europe/London";

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    type: String,
    example: "Monday",
    required: false,
    default: "Sunday",
  })
  readonly weekStart?: string = "Sunday";

  @IsOptional()
  @IsBoolean()
  readonly autoAcceptCreator?: boolean = true;
}
