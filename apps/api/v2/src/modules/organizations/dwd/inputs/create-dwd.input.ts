import { Expose, Type } from "class-transformer";
import { IsString, IsNotEmpty, ValidateNested, IsObject } from "class-validator";

class ServiceAccountKeyInput {
  @IsString()
  @IsNotEmpty()
  @Expose()
  private_key!: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  client_email!: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  client_id!: string;
}

export class CreateDwdInput {
  @IsString()
  @IsNotEmpty()
  @Expose()
  workspacePlatformSlug!: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  domain!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => ServiceAccountKeyInput)
  @Expose()
  serviceAccountKey!: ServiceAccountKeyInput;
}
