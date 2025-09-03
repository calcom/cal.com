import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, IsBoolean } from "class-validator";

export class SendVerificationEmailInput {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: "johndoe" })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: "en" })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isVerifyingEmail?: boolean;
}
