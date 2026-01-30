import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsEnum, IsNotEmptyObject, IsNumber, IsString, ValidateNested } from "class-validator";

export class OAuth2TokensDto {
  @ApiProperty({
    description: "The access token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  @Expose({ name: "accessToken" })
  access_token!: string;

  @ApiProperty({
    description: "The token type",
    example: "bearer",
  })
  @IsString()
  @Expose({ name: "tokenType" })
  token_type!: string;

  @ApiProperty({
    description: "The refresh token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  @Expose({ name: "refreshToken" })
  refresh_token!: string;

  @ApiProperty({
    description: "The number of seconds until the access token expires",
    example: 1800,
  })
  @IsNumber()
  @Expose({ name: "expiresIn" })
  expires_in!: number;
}

export class OAuth2TokensResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  @Expose()
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: OAuth2TokensDto,
  })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => OAuth2TokensDto)
  @Expose()
  data!: OAuth2TokensDto;
}
