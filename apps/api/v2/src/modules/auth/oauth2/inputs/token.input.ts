import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class OAuth2TokenInput {
  @ApiProperty({
    name: "grant_type",
    enum: ["authorization_code", "refresh_token"],
    description: "The OAuth2 grant type",
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(["authorization_code", "refresh_token"])
  grant_type!: "authorization_code" | "refresh_token";

  @ApiProperty({
    name: "client_id",
    description: "The OAuth2 client ID",
  })
  @IsString()
  @IsNotEmpty()
  client_id!: string;

  @ApiProperty({
    name: "client_secret",
    description: "The client secret (required for confidential clients)",
    required: false,
  })
  @IsOptional()
  @IsString()
  client_secret?: string;

  @ApiProperty({
    name: "code",
    description: "The authorization code (required for authorization_code grant)",
    required: false,
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({
    name: "redirect_uri",
    description: "The redirect URI used in the authorization request (required for authorization_code grant)",
    required: false,
  })
  @IsOptional()
  @IsString()
  redirect_uri?: string;

  @ApiProperty({
    name: "code_verifier",
    description: "PKCE code verifier (required if code_challenge was used)",
    required: false,
  })
  @IsOptional()
  @IsString()
  code_verifier?: string;

  @ApiProperty({
    name: "refresh_token",
    description: "The refresh token (required for refresh_token grant)",
    required: false,
  })
  @IsOptional()
  @IsString()
  refresh_token?: string;
}
