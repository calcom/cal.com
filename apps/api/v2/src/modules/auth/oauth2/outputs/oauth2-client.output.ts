import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { OAuthClientType } from "@calcom/prisma/enums";
import { ApiHideProperty, ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export class OAuth2ClientDto {
  @ApiProperty({
    description: "The OAuth client ID",
    example: "clxxxxxxxxxxxxxxxx",
  })
  @IsString()
  @Expose({ name: "clientId" })
  client_id!: string;

  @ApiProperty({
    description: "The redirect URIs for the OAuth client",
    example: ["https://example.com/callback"],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @Expose({ name: "redirectUris" })
  redirect_uris!: string[];

  @ApiHideProperty()
  @IsString()
  @Expose({ name: "redirectUri" })
  redirect_uri!: string;

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
  @Expose({ name: "isTrusted" })
  is_trusted!: boolean;

  @ApiProperty({
    description: "The type of OAuth client (CONFIDENTIAL or PUBLIC)",
    example: "CONFIDENTIAL",
    enum: OAuthClientType,
  })
  @IsEnum(OAuthClientType)
  @Expose({ name: "clientType" })
  client_type!: OAuthClientType;
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
