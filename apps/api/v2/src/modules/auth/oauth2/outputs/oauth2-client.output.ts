import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsBoolean, IsEnum, IsNotEmptyObject, IsOptional, IsString, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";
import { OAuthClientType } from "@calcom/prisma/enums";

export class OAuth2ClientDto {
  @ApiProperty({
    description: "The OAuth client ID",
    example: "clxxxxxxxxxxxxxxxx",
  })
  @IsString()
  @Expose({ name: "clientId" })
  id!: string;

  @ApiProperty({
    description: "The redirect URI for the OAuth client",
    example: "https://example.com/callback",
  })
  @IsString()
  @Expose()
  redirectUri!: string;

  @ApiProperty({
    description: "The name of the OAuth client",
    example: "My App",
  })
  @IsString()
  @Expose()
  name!: string;

  @ApiProperty({
    description: "The logo URL of the OAuth client",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Expose()
  logo?: string | null;

  @ApiProperty({
    description: "Whether the OAuth client is trusted",
    example: false,
  })
  @IsBoolean()
  @Expose()
  isTrusted!: boolean;

  @ApiProperty({
    description: "The type of OAuth client (CONFIDENTIAL or PUBLIC)",
    example: "CONFIDENTIAL",
    enum: OAuthClientType,
  })
  @IsEnum(OAuthClientType)
  @Expose({ name: "clientType" })
  type!: OAuthClientType;
}

export class OAuth2ClientResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  @Expose()
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: OAuth2ClientDto,
  })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => OAuth2ClientDto)
  @Expose()
  data!: OAuth2ClientDto;
}
