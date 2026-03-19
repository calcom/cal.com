import { ApiProperty } from "@nestjs/swagger";
import { Equals, IsString } from "class-validator";

export class OAuth2RefreshConfidentialInput {
  @ApiProperty({
    description: "The client identifier",
    example: "my-client-id",
  })
  @IsString()
  client_id!: string;

  @ApiProperty({
    description: "The grant type — must be 'refresh_token'",
    example: "refresh_token",
    enum: ["refresh_token"],
  })
  @IsString()
  @Equals("refresh_token")
  grant_type!: "refresh_token";

  @ApiProperty({
    description: "The refresh token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  refresh_token!: string;

  @ApiProperty({
    description: "The client secret for confidential clients",
  })
  @IsString()
  client_secret!: string;
}

export class OAuth2RefreshPublicInput {
  @ApiProperty({
    description: "The client identifier",
    example: "my-client-id",
  })
  @IsString()
  client_id!: string;

  @ApiProperty({
    description: "The grant type — must be 'refresh_token'",
    example: "refresh_token",
    enum: ["refresh_token"],
  })
  @IsString()
  @Equals("refresh_token")
  grant_type!: "refresh_token";

  @ApiProperty({
    description: "The refresh token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  refresh_token!: string;
}

export type OAuth2RefreshInput = OAuth2RefreshConfidentialInput | OAuth2RefreshPublicInput;
