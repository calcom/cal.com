import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsNumber, IsString } from "class-validator";

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
