import { RefreshApiKeyInput } from "@/modules/api-keys/inputs/refresh-api-key.input";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, Length, Min } from "class-validator";

export class CreateOrganizationInput extends RefreshApiKeyInput {
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
}
