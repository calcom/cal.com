import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsNotEmpty, ValidateNested, IsObject, IsBoolean, IsOptional } from "class-validator";

class ServiceAccountKeyInput {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  private_key!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  client_email!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  client_id!: string;
}

export class CreateDwdInput {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  workspacePlatformSlug!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  domain!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => ServiceAccountKeyInput)
  @ApiProperty({ type: ServiceAccountKeyInput })
  serviceAccountKey!: ServiceAccountKeyInput;
}
