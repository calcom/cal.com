import { IsEmail, IsOptional, IsString } from "class-validator";

export class UpdateUserResponseDto {
  @IsOptional()
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  username!: string;

  @IsOptional()
  @IsString()
  brandColor!: string;

  @IsOptional()
  @IsString()
  darkBrandColor!: string;
}
