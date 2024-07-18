import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, Validate } from "class-validator";

import { SkipTakePagination } from "@calcom/platform-types";

import { IsEmailStringOrArray } from "../validators/isEmailStringOrArray";

export class GetUsersInput extends SkipTakePagination {
  @IsOptional()
  @Validate(IsEmailStringOrArray)
  @Transform(({ value }: { value: string | string[] }) => {
    return typeof value === "string" ? [value] : value;
  })
  @ApiProperty({
    description: "The email address or an array of email addresses to filter by",
  })
  emails?: string[];
}
