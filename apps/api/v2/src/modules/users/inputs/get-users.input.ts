import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNumber, IsOptional, Max, Min, Validate } from "class-validator";

import { IsEmailStringOrArray } from "../validators/isEmailStringOrArray";

export class GetUsersInput {
  @ApiPropertyOptional({ description: "The number of items to return", example: 10, default: 250 })
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  take?: number;

  @ApiPropertyOptional({ description: "The number of items to skip", example: 0, default: 0 })
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @Min(0)
  @IsOptional()
  skip?: number;

  @IsOptional()
  @Validate(IsEmailStringOrArray)
  @Transform(({ value }: { value: string | string[] }) => {
    return typeof value === "string" ? [value] : value;
  })
  @ApiPropertyOptional({
    type: [String],
    description: "The email address or an array of email addresses to filter by",
    example: ["user1@example.com", "user2@example.com"],
  })
  emails?: string[];
}
