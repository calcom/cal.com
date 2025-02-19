import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Length } from "class-validator";

export class CreateOrganizationInput {
  @IsString()
  @Length(1)
  @ApiProperty({ description: "Name of the organization", example: "CalTeam" })
  readonly name!: string;

  @IsString()
  @ApiProperty({ type: String, description: "Organization slug", example: "cal-tel" })
  readonly slug!: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  readonly metadata?: string;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({
    description: "For how many days is managed organization api key valid. Defaults to 30 days.",
    example: 60,
    default: 30,
  })
  readonly apiKeyDaysValid?: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ description: "If true, organization api key never expires.", example: true })
  readonly apiKeyNeverExpires?: boolean;
}
