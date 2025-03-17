import { BadRequestException } from "@nestjs/common";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { ArrayNotEmpty, isEmail, IsOptional } from "class-validator";

import { Pagination } from "@calcom/platform-types";

export class GetManagedUsersInput extends Pagination {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((email: string) => {
        const trimmed = email.trim();
        if (!isEmail(trimmed)) {
          throw new BadRequestException(`Invalid email ${trimmed}`);
        }
        return trimmed;
      });
    }
    return value;
  })
  @ArrayNotEmpty({ message: "emails cannot be empty." })
  @ApiPropertyOptional({
    description:
      "Filter managed users by email. If you want to filter by multiple emails, separate them with a comma.",
    example: "?emails=email1@example.com,email2@example.com",
  })
  emails?: string[];
}
