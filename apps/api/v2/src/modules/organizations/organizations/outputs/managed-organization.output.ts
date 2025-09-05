import { Metadata } from "@calcom/platform-types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Transform, Type } from "class-transformer";
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Length, ValidateNested } from "class-validator";

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
