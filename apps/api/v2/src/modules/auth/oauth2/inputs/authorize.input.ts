import { ApiHideProperty, ApiProperty } from "@nestjs/swagger";
import { Equals, IsArray, IsEnum, IsOptional, IsString } from "class-validator";

import { AccessScope } from "@calcom/prisma/enums";

export class OAuth2AuthorizeInput {
  @ApiProperty({
    description:
      "The redirect URI to redirect to after authorization. Must exactly match the registered redirect URI.",
    example: "https://example.com/callback",
  })
  @IsString()
  redirectUri!: string;

  @ApiProperty({
    description: "OAuth state parameter for CSRF protection. Will be included in the redirect.",
    required: false,
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    description: "The scopes to request",
    enum: AccessScope,
    isArray: true,
    example: ["READ_BOOKING", "READ_PROFILE"],
  })
  @IsArray()
  @IsEnum(AccessScope, { each: true })
  scopes: AccessScope[] = [];

  @ApiProperty({
    description: "The team slug to authorize for (optional)",
    required: false,
  })
  @IsOptional()
  @IsString()
  teamSlug?: string;

  @ApiProperty({
    description: "PKCE code challenge (required for public clients)",
    required: false,
  })
  @IsOptional()
  @IsString()
  codeChallenge?: string;

  @ApiHideProperty()
  @IsString()
  @Equals("S256")
  codeChallengeMethod: string = "S256";
}
