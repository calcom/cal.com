import { ApiProperty } from "@nestjs/swagger";
import { Equals, IsString } from "class-validator";

export class OAuth2ExchangeConfidentialInput {
  @ApiProperty({
    description: "The grant type — must be 'authorization_code'",
    example: "authorization_code",
    enum: ["authorization_code"],
  })
  @IsString()
  @Equals("authorization_code")
  grantType!: "authorization_code";

  @ApiProperty({
    description: "The authorization code received from the authorize endpoint",
    example: "abc123",
  })
  @IsString()
  code!: string;

  @ApiProperty({
    description: "The redirect URI used in the authorization request",
    example: "https://example.com/callback",
  })
  @IsString()
  redirectUri!: string;

  @ApiProperty({
    description: "The client secret for confidential clients",
  })
  @IsString()
  clientSecret!: string;
}

export class OAuth2ExchangePublicInput {
  @ApiProperty({
    description: "The grant type — must be 'authorization_code'",
    example: "authorization_code",
    enum: ["authorization_code"],
  })
  @IsString()
  @Equals("authorization_code")
  grantType!: "authorization_code";

  @ApiProperty({
    description: "The authorization code received from the authorize endpoint",
    example: "abc123",
  })
  @IsString()
  code!: string;

  @ApiProperty({
    description: "The redirect URI used in the authorization request",
    example: "https://example.com/callback",
  })
  @IsString()
  redirectUri!: string;

  @ApiProperty({
    description: "PKCE code verifier (required for public clients that used code_challenge)",
  })
  @IsString()
  codeVerifier!: string;
}

export type OAuth2ExchangeInput = OAuth2ExchangeConfidentialInput | OAuth2ExchangePublicInput;
