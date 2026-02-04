import { ApiHideProperty, ApiProperty } from "@nestjs/swagger";
import { Equals, IsOptional, IsString } from "class-validator";

export class OAuth2ExchangeInput {
  @ApiProperty({
    description: "The authorization code received from the authorize endpoint",
    example: "abc123",
  })
  @IsString()
  code!: string;

  @ApiProperty({
    description: "The client secret (required for confidential clients)",
    required: false,
  })
  @IsOptional()
  @IsString()
  clientSecret?: string;

  @ApiProperty({
    description: "The redirect URI used in the authorization request",
    example: "https://example.com/callback",
  })
  @IsString()
  redirectUri!: string;

  @ApiHideProperty()
  @IsString()
  @Equals("authorization_code")
  grantType: string = "authorization_code";

  @ApiProperty({
    description: "PKCE code verifier (required if code_challenge was used)",
    required: false,
  })
  @IsOptional()
  @IsString()
  codeVerifier?: string;
}
