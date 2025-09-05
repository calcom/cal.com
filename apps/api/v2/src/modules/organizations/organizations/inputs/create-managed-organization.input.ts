import { METADATA_DOCS, Metadata, ValidateMetadata } from "@calcom/platform-types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString, Length } from "class-validator";
import { RefreshApiKeyInput } from "@/modules/api-keys/inputs/refresh-api-key.input";

export class CreateOrganizationInput extends RefreshApiKeyInput {
  @IsString()
  @Length(1)
  @ApiProperty({ description: "Name of the organization", example: "CalTeam" })
  readonly name!: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    type: String,
    description:
      "Organization slug in kebab-case - if not provided will be generated automatically based on name.",
    example: "cal-tel",
  })
  readonly slug?: string;

  @ApiPropertyOptional({
    type: Object,
    description: METADATA_DOCS,
    example: { key: "value" },
  })
  @IsObject()
  @IsOptional()
  @ValidateMetadata()
  metadata?: Metadata;
}
