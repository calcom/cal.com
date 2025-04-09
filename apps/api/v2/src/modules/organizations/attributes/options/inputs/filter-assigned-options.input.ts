import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsArray, IsOptional, IsString } from "class-validator";

export class FilterAssignedOptionsQueryDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String], description: "Array of option IDs to filter by" })
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : []))
  assignedOptionIds?: string[];
}
