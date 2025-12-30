import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Transform, } from "class-transformer";
import { IsInt, IsObject, IsOptional, IsString, Length, } from "class-validator";

import { Metadata } from "@calcom/platform-types";

export class ManagedOrganizationOutput {
  @IsInt()
  @Expose()
  @ApiProperty()
  readonly id!: number;

  @IsString()
  @Length(1)
  @Expose()
  @ApiProperty()
  readonly name!: string;

  @IsString()
  @IsOptional()
  @Expose()
  @ApiPropertyOptional()
  readonly slug?: string;

  @ApiPropertyOptional({
    type: Object,
    example: { key: "value" },
  })
  @IsObject()
  @IsOptional()
  @Expose()
  @Transform(
    // note(Lauris): added this transform because without it metadata is removed for some reason
    ({ obj }: { obj: { metadata: Metadata | null | undefined } }) => {
      return obj.metadata || undefined;
    }
  )
  metadata?: Metadata;
}

export class ManagedOrganizationWithApiKeyOutput extends ManagedOrganizationOutput {
  @IsString()
  @Expose()
  @ApiProperty()
  readonly apiKey!: string;
}
