import { IsArray, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateOAuthClientInput {
  @IsOptional()
  @IsString()
  logo?: string;

  @IsString()
  name: string;

  @IsArray()
  @IsString({ each: true })
  redirect_uris: string[];

  @IsNumber()
  permissions: number;
}
