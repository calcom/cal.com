import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class OAuth2RefreshInput {
  @ApiProperty({
    description: "The refresh token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  refreshToken!: string;

  @ApiProperty({
    description: "The client secret (required for confidential clients)",
    required: false,
  })
  @IsOptional()
  @IsString()
  clientSecret?: string;

  @ApiProperty({
    description: "The grant type (must be refresh_token)",
    example: "refresh_token",
  })
  @IsString()
  grantType!: string;

  @ApiProperty({
    description: "PKCE code verifier (required if PKCE was used in the original authorization)",
    required: false,
  })
  @IsOptional()
  @IsString()
  codeVerifier?: string;
}
