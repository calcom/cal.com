import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNumber, IsOptional, IsString } from "class-validator";

export class GetVerifiedEmailsParams {
  @ApiPropertyOptional({ example: "12345" })
  @IsOptional()
  @IsString()
  teamId?: string;
}

export class GetVerifiedEmailsInput {
  @ApiProperty()
  @IsNumber()
  userId!: number;

  @ApiProperty()
  @IsEmail()
  @IsString()
  userEmail!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  teamId?: number;
}
