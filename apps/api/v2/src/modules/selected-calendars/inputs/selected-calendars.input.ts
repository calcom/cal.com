import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString } from "class-validator";

export class SelectedCalendarsInputDto {
  @IsString()
  readonly integration!: string;

  @IsString()
  readonly externalId!: string;

  @IsInt()
  readonly credentialId!: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly delegationCredentialId?: string;
}

export class SelectedCalendarsQueryParamsInputDto {
  @IsString()
  readonly integration!: string;

  @IsString()
  readonly externalId!: string;

  @IsString()
  readonly credentialId!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  readonly delegationCredentialId?: string;
}
