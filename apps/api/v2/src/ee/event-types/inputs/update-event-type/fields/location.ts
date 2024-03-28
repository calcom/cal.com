import { IsString, IsOptional, IsBoolean, IsNumber } from "class-validator";

export class Location {
  @IsString()
  type!: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  link?: string;

  @IsBoolean()
  @IsOptional()
  displayLocationPublicly?: boolean;

  @IsString()
  @IsOptional()
  hostPhoneNumber?: string;

  @IsNumber()
  @IsOptional()
  credentialId?: number;

  @IsString()
  @IsOptional()
  teamName?: string;
}
