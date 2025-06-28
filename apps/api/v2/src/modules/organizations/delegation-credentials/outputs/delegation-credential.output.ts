import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsBoolean, IsDate, IsInt, IsObject, IsString, ValidateNested } from "class-validator";

class WorkspacePlatformDto {
  @ApiProperty()
  @IsString()
  @Expose()
  name!: string;

  @ApiProperty()
  @IsString()
  @Expose()
  slug!: string;
}

export class DelegationCredentialOutput {
  @ApiProperty()
  @IsString()
  @Expose()
  id!: string;

  @ApiProperty()
  @IsBoolean()
  @Expose()
  enabled!: boolean;

  @ApiProperty()
  @IsString()
  @Expose()
  domain!: string;

  @ApiProperty()
  @IsInt()
  @Expose()
  organizationId!: number;

  @ApiProperty({ type: WorkspacePlatformDto })
  @Type(() => WorkspacePlatformDto)
  @IsObject()
  @ValidateNested()
  @Expose()
  workspacePlatform!: WorkspacePlatformDto;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  @Expose()
  updatedAt!: Date;
}
