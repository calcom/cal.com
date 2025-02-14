import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, IsUrl, Length } from "class-validator";

export class CreateOrganizationInput {
  @IsString()
  @Length(1)
  @ApiProperty({ description: "Name of the organization", example: "CalTeam", required: true })
  readonly name!: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: String, description: "Organization slug", example: "cal-tel" })
  readonly slug!: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  readonly metadata?: string;
}
