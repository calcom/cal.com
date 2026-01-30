import { AccessScope } from "@calcom/prisma/enums";
import { ApiHideProperty, ApiProperty } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";
import { Equals, IsArray, IsEnum, IsOptional, IsString } from "class-validator";

export class OAuth2AuthorizeInput {
  @ApiProperty({
    description:
      "The redirect URI to redirect to after authorization. Must exactly match the registered redirect URI.",
    example: "https://example.com/callback",
  })
  @IsString()
  @Transform(({ obj }) => obj.redirect_uri ?? obj.redirectUri)
  @Expose()
  redirect_uri!: string;

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
  @Transform(({ obj }) => obj.team_slug ?? obj.teamSlug)
  @Expose()
  team_slug?: string;

  @ApiProperty({
    description: "PKCE code challenge (required for public clients)",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ obj }) => obj.code_challenge ?? obj.codeChallenge)
  @Expose()
  code_challenge?: string;

  @ApiHideProperty()
  @IsString()
  @Equals("S256")
  @Transform(({ obj }) => obj.code_challenge_method ?? obj.codeChallengeMethod ?? "S256")
  @Expose()
  code_challenge_method: string = "S256";
}
