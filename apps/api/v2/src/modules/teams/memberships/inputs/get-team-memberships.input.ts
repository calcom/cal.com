import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { ArrayMaxSize, ArrayNotEmpty, IsEmail, IsOptional } from "class-validator";

import { SkipTakePagination } from "@calcom/platform-types";

export class GetTeamMembershipsInput extends SkipTakePagination {
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null) return undefined;
    const rawValues = (Array.isArray(value) ? value : [value]).flatMap((entry) =>
      typeof entry === "string" ? entry.split(",") : []
    );
    const normalized = rawValues
      .map((email) => email.trim())
      .filter((email) => email.length > 0)
      .map((email) => email.toLowerCase());
    const deduplicated = [...new Set(normalized)];
    return deduplicated.length > 0 ? deduplicated : undefined;
  })
  @ArrayNotEmpty({ message: "emails cannot be empty." })
  @ArrayMaxSize(20, {
    message: "emails array cannot contain more than 20 email addresses for team membership filtering",
  })
  @IsEmail({}, { each: true, message: "Each email must be a valid email address" })
  @ApiPropertyOptional({
    type: [String],
    description:
      "Filter team memberships by email addresses. If you want to filter by multiple emails, separate them with a comma (max 20 emails for performance).",
    example: "?emails=user1@example.com,user2@example.com",
  })
  emails?: string[];
}
