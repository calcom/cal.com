import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsString, IsNumber, IsOptional, IsDate, IsBoolean } from "class-validator";

export class PlatformOAuthClientDto {
  @ApiProperty({ example: "clsx38nbl0001vkhlwin9fmt0" })
  @IsString()
  id!: string;

  @ApiProperty({ example: "MyClient" })
  @IsString()
  name!: string;

  @ApiProperty({ example: "secretValue" })
  @IsString()
  secret!: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  permissions!: number;

  @ApiPropertyOptional({ example: "https://example.com/logo.png" })
  @IsOptional()
  @IsString()
  logo!: string | null;

  @ApiProperty({ example: ["https://example.com/callback"] })
  @IsArray()
  @IsString({ each: true })
  redirectUris!: string[];

  @ApiProperty({ example: 1 })
  @IsNumber()
  organizationId!: number;

  @ApiProperty({ example: "2024-03-23T08:33:21.851Z", type: Date })
  @IsDate()
  createdAt!: Date;

  @IsBoolean()
  @ApiProperty({ example: true })
  areEmailsEnabled!: boolean;

  @IsBoolean()
  @ApiProperty({
    example: true,
    description:
      "If enabled, when creating a managed user the managed user will have 4 default event types: 30 and 60 minutes without Cal video, 30 and 60 minutes with Cal video. Leave this disabled if you want to create a managed user and then manually create event types for the user.",
  })
  areDefaultEventTypesEnabled!: boolean;
}
