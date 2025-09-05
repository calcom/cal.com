import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UpdateOrganizationAttributeOptionInput {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  readonly value?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  readonly slug?: string;
}
