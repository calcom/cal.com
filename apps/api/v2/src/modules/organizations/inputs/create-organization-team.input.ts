import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, IsUrl, Length } from "class-validator";

export class CreateOrgTeamDto {
  @IsString()
  @Length(1)
  @ApiProperty({ description: "Name of the team", example: "CalTeam" })
  readonly name!: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: "Team slug", example: "caltel" })
  readonly slug?: string;

  @IsOptional()
  @IsUrl()
  @ApiProperty({
    example: "https://cal.com/api/avatar/d95949bc-ccb1-400f-acf6-045c51a16856.png",
    description: `URL of the teams logo image`,
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
  @ApiProperty({
    example: "https://cal.com/api/avatar/d95949bc-ccb1-400f-acf6-045c51a16856.png",
    description: `URL of the teams banner image which is shown on booker`,
  })
  readonly bannerUrl?: string;

  @IsOptional()
  @IsString()
  readonly timeFormat?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: "America/New_York",
    description: `Timezone is used to create teams's default schedule from Monday to Friday from 9AM to 5PM. It will default to Europe/London if not passed.`,
  })
  readonly timeZone?: string = "Europe/London";

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: "Monday",
  })
  readonly weekStart?: string = "Sunday";

  @IsOptional()
  @IsBoolean()
  readonly autoAcceptCreator?: boolean = true;
}
