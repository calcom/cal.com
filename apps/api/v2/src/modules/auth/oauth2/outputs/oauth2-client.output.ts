import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsNotEmptyObject, IsOptional, IsString, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class OAuth2ClientDto {
  @ApiProperty({
    description: "The OAuth client ID",
    example: "clxxxxxxxxxxxxxxxx",
  })
  @IsString()
  clientId!: string;

  @ApiProperty({
    description: "The redirect URI for the OAuth client",
    example: "https://example.com/callback",
  })
  @IsString()
  redirectUri!: string;

  @ApiProperty({
    description: "The name of the OAuth client",
    example: "My App",
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: "The logo URL of the OAuth client",
    required: false,
  })
  @IsOptional()
  @IsString()
  logo?: string | null;

  @ApiProperty({
    description: "Whether the OAuth client is trusted",
    example: false,
  })
  @IsBoolean()
  isTrusted!: boolean;
}

export class OAuth2ClientResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: OAuth2ClientDto,
  })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => OAuth2ClientDto)
  data!: OAuth2ClientDto;
}
