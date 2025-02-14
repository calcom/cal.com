import { ApiProperty as DocsProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Length } from "class-validator";

export class ManagedOrganizationOutput {
  @IsInt()
  @Expose()
  @DocsProperty()
  readonly id!: number;

  @IsString()
  @Length(1)
  @Expose()
  @DocsProperty()
  readonly name!: string;

  @IsString()
  @Expose()
  @DocsProperty()
  readonly slug!: string;

  @IsString()
  @Expose()
  @DocsProperty()
  readonly apiKey!: string;

  @IsOptional()
  @IsString()
  @Expose()
  @ApiPropertyOptional()
  readonly metadata?: string;
}
