import { GetUsersInput } from "@/modules/users/inputs/get-users.input";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsArray, IsEnum, IsOptional, IsString } from "class-validator";

export enum AttributeQueryOperator {
  OR = "OR",
  AND = "AND",
  NONE = "NONE",
}

export class FilterTeamUsersInput extends GetUsersInput {
  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ type: [String], description: "Array of attribute option IDs to filter by" })
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : []))
  attributeOptionIds!: string[];

  @IsOptional()
  @IsEnum(AttributeQueryOperator)
  @ApiPropertyOptional({
    enum: AttributeQueryOperator,
    default: AttributeQueryOperator.OR,
    description: "Logical operator to use when filtering: OR, AND, or NONE",
  })
  attributeQueryOperator: AttributeQueryOperator = AttributeQueryOperator.OR;
}
