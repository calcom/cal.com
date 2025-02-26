import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
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

  @IsOptional()
  @IsObject()
  @Expose()
  @ApiPropertyOptional({ type: Object })
  @Type(() => Object)
  readonly metadata?: Record<string, unknown>;
}

export class ManagedOrganizationWithApiKeyOutput extends ManagedOrganizationOutput {
  @IsString()
  @Expose()
  @ApiProperty()
  readonly apiKey!: string;
}
