import { IsArray, IsOptional, IsString } from "class-validator";

export class UpdateOAuthClientInput {
  @IsOptional()
  @IsString()
  logo?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  redirectUris?: string[] = [];
}
