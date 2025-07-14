import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString, Length } from "class-validator";

import { Metadata, METADATA_DOCS, ValidateMetadata } from "@calcom/platform-types";

export class UpdateOrganizationInput {
  @IsString()
  @IsOptional()
  @Length(1)
  @ApiPropertyOptional({ description: "Name of the organization", example: "CalTeam" })
  readonly name?: string;

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
