import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUrl, Length } from "class-validator";

export class UpdateOrganizationInput {
  @IsString()
  @IsOptional()
  @Length(1)
  @ApiPropertyOptional({ description: "Name of the organization", example: "CalTeam" })
  readonly name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: String, description: "Organization slug", example: "cal-tel" })
  readonly slug?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  readonly metadata?: string;
}
