import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, Validate, ArrayMaxSize } from "class-validator";

import { GetUsersInput } from "../../../users/inputs/get-users.input";
import { IsEmailStringOrArray } from "../../../users/validators/isEmailStringOrArray";

export class GetTeamMembershipsInput extends GetUsersInput {
  @IsOptional()
  @Validate(IsEmailStringOrArray)
  @ArrayMaxSize(20, {
    message: "emails array cannot contain more than 20 email addresses for team membership filtering",
  })
  @Transform(({ value }: { value: string | string[] }) => {
    return typeof value === "string" ? [value] : value;
  })
  @ApiPropertyOptional({
    type: [String],
    description: "Filter team memberships by email addresses (max 20 emails for performance)",
    example: ["user1@example.com", "user2@example.com"],
  })
  emails?: string[];
}
