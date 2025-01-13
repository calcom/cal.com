import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class AssignOrganizationAttributeOptionToUserInput {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiPropertyOptional()
  readonly value?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiPropertyOptional()
  readonly attributeOptionId?: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  readonly attributeId!: string;
}
