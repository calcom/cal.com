import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsArray, ArrayMinSize, IsString } from "class-validator";

export class GetAssignedAttributeOptions {
  @ApiPropertyOptional({ type: Number, description: "Number of responses to skip" })
  @Transform(({ value }) => value && parseInt(value))
  @IsOptional()
  skip?: number;

  @ApiPropertyOptional({ type: Number, description: "Number of responses to take" })
  @Transform(({ value }) => value && parseInt(value))
  @IsOptional()
  take?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((optId: string) => optId);
    }
    return value;
  })
  @ApiPropertyOptional({
    type: [String],
    description: "Filter by assigned option ids. ids must be separated by a comma.",
    example: "?assignedOptionIds=aaaaaaaa-bbbb-cccc-dddd-eeeeee1eee,aaaaaaaa-bbbb-cccc-dddd-eeeeee2eee",
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: "assignedOptionIds must contain at least 1 attribute option id" })
  assignedOptionIds?: string[];
}
