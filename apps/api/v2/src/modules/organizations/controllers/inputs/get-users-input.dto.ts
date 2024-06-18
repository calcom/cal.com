import { IsSingleEmailOrEmailArray } from "@/modules/organizations/controllers/inputs/validator/isEmailStringOrArray";
import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, Validate } from "class-validator";

export class GetUsersInput {
  @IsOptional()
  @Validate(IsSingleEmailOrEmailArray)
  @ApiProperty({
    description: "The email address or an array of email addresses to filter by",
  })
  email!: string | string[];
}
