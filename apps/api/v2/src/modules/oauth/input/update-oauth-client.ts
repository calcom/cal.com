import { IsArray, IsNumber, IsOptional, IsString } from "class-validator";

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
  redirect_uris?: string[] = [];
}
