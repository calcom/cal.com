import { ApiProperty } from "@nestjs/swagger";
import { Equals, IsString } from "class-validator";

export class OAuth2RefreshConfidentialInput {
  @ApiProperty({
    description: "The grant type — must be 'refresh_token'",
    example: "refresh_token",
    enum: ["refresh_token"],
  })
  @IsString()
  @Equals("refresh_token")
  grantType!: "refresh_token";

  @ApiProperty({
    description: "The refresh token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  refreshToken!: string;

  @ApiProperty({
    description: "The client secret for confidential clients",
  })
  @IsString()
  clientSecret!: string;
}

export class OAuth2RefreshPublicInput {
  @ApiProperty({
    description: "The grant type — must be 'refresh_token'",
    example: "refresh_token",
    enum: ["refresh_token"],
  })
  @IsString()
  @Equals("refresh_token")
  grantType!: "refresh_token";

  @ApiProperty({
    description: "The refresh token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  refreshToken!: string;
}

export type OAuth2RefreshInput = OAuth2RefreshConfidentialInput | OAuth2RefreshPublicInput;
