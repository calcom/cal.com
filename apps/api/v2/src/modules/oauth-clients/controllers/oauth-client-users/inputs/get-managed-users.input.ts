import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { ArrayNotEmpty, IsOptional, IsString } from "class-validator";

import { Pagination } from "@calcom/platform-types";

export class GetManagedUsersInput extends Pagination {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((status: string) => status.trim());
    }
    return value;
  })
  @ArrayNotEmpty({ message: "emails cannot be empty." })
  @IsString({ each: true })
  @ApiPropertyOptional({
    description:
      "Filter managed users by email. If you want to filter by multiple emails, separate them with a comma.",
    example: "?emails=email1@example.com,email2@example.com",
  })
  emails?: string[];
}
