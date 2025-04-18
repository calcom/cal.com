import { GetUsersInput } from "@/modules/users/inputs/get-users.input";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { Expose } from "class-transformer";
import { IsOptional, IsArray, ArrayMinSize, IsString, IsIn, IsNumber } from "class-validator";

export class GetOrganizationsUsersInput extends GetUsersInput {
  @Expose()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((optId: string) => optId);
    }
    return value;
  })
  @ApiPropertyOptional({
    type: [String],
    description: "Filter by assigned attribute option ids. ids must be separated by a comma.",
    example: "?assignedOptionIds=aaaaaaaa-bbbb-cccc-dddd-eeeeee1eee,aaaaaaaa-bbbb-cccc-dddd-eeeeee2eee",
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: "assignedOptionIds must contain at least 1 attribute option id" })
  assignedOptionIds?: string[];

  @ApiPropertyOptional({
    type: String,
    description: "Query operator used to filter assigned options, AND by default.",
    example: "NONE",
  })
  @IsOptional()
  @IsString()
  @IsIn(["OR", "AND", "NONE"])
  attributeQueryOperator: "AND" | "OR" | "NONE" = "AND"; // Default value

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((teamId: string) => parseInt(teamId));
    }
    return value;
  })
  @ApiPropertyOptional({
    type: [Number],
    description: "Filter by teamIds. Team ids must be separated by a comma.",
    example: "?teamIds=100,200",
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1, { message: "teamIds must contain at least 1 team id" })
  teamIds?: number[];
}
