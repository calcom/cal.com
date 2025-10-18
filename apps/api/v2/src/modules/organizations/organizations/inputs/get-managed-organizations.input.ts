import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

import { SkipTakePagination } from "@calcom/platform-types";

export class GetManagedOrganizationsInput_2024_08_13 extends SkipTakePagination {
  @IsOptional()
  @IsString()
  @ApiProperty({ example: "organization-slug", description: "The slug of the managed organization" })
  slug?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: "metadata-key",
    description:
      "The key of the metadata - it is case sensitive so provide exactly as stored. If you provide it then you must also provide metadataValue",
  })
  metadataKey?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: "metadata-value",
    description:
      "The value of the metadata - it is case sensitive so provide exactly as stored. If you provide it then you must also provide metadataKey",
  })
  metadataValue?: string;
}
