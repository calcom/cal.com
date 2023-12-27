import { IsArray, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateOAuthClientInput {
  @IsOptional()
  @IsString()
  logo?: string;

  @IsString()
  name!: string;

  @IsArray()
  @IsString({ each: true })
  redirectUris!: string[];

  @IsNumber()
  permissions!: number;
}

export class DeleteOAuthClientInput {
  @IsString()
  id!: string;
}
