import { ApiHideProperty, ApiProperty } from "@nestjs/swagger";
import { Equals, IsOptional, IsString } from "class-validator";

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

  @ApiHideProperty()
  @IsString()
  @Equals("refresh_token")
  grantType: string = "refresh_token";

  @ApiProperty({
    description: "PKCE code verifier (required if PKCE was used in the original authorization)",
    required: false,
  })
  @IsOptional()
  @IsString()
  codeVerifier?: string;
}
