import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNumber, IsOptional, Max, Min, Validate, ArrayMaxSize } from "class-validator";

import { IsEmailStringOrArray } from "../validators/isEmailStringOrArray";

export class GetUsersInput {
  @ApiProperty({ required: false, description: "The number of items to return", example: 10 })
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  take?: number;

  @ApiProperty({ required: false, description: "The number of items to skip", example: 0 })
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @Min(0)
  @IsOptional()
  skip?: number;

  @IsOptional()
  @Validate(IsEmailStringOrArray)
  @ArrayMaxSize(50, { message: "emails array cannot contain more than 50 email addresses" })
  @Transform(({ value }: { value: string | string[] }) => {
    return typeof value === "string" ? [value] : value;
  })
  @ApiPropertyOptional({
    type: [String],
    description: "The email address or an array of email addresses to filter by (max 50 emails)",
    example: ["user1@example.com", "user2@example.com"],
  })
  emails?: string[];
}
