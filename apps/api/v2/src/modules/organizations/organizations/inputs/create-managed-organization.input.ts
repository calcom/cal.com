import { RefreshApiKeyInput } from "@/modules/api-keys/inputs/refresh-api-key.input";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsObject, IsOptional, IsString, Length } from "class-validator";

export class CreateOrganizationInput extends RefreshApiKeyInput {
  @IsString()
  @Length(1)
  @ApiProperty({ description: "Name of the organization", example: "CalTeam" })
  readonly name!: string;

  @IsOptional()
  @IsObject()
  @ApiPropertyOptional({ type: Object })
  readonly metadata?: Record<string, unknown>;
}
