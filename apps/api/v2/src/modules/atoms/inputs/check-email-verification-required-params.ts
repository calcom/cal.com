import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString } from "class-validator";

export class CheckEmailVerificationRequiredParams {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: "user@example.com" })
  @IsOptional()
  @IsString()
  userSessionEmail?: string;
}
