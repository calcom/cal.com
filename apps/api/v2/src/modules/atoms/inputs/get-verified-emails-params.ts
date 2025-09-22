import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, IsEmail } from "class-validator";

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
