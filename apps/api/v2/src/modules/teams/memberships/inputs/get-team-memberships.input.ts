import { GetUsersInput } from "@/modules/users/inputs/get-users.input";
import { BadRequestException } from "@nestjs/common";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { ArrayNotEmpty, isEmail, IsOptional } from "class-validator";

export class GetTeamMembershipsInput extends GetUsersInput {
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
    type: [String],
    description:
      "Filter team memberships by email addresses. If you want to filter by multiple emails, separate them with a comma (max 20 emails for performance).",
    example: "?emails=user1@example.com,user2@example.com",
  })
  emails?: string[];
}
