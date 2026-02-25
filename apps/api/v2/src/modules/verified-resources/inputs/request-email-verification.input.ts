import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsEmail, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class RequestEmailVerificationInput {
  @ApiProperty({
    type: String,
    description: "Email to verify.",
    example: "acme@example.com",
  })
  @IsEmail()
  @Expose()
  email!: string;

  @ApiProperty({
    type: String,
    description:
      "Optional recipient name. When provided, the verification email will greet the recipient with this name (e.g. 'Hi Jane') instead of the API caller's username.",
    example: "Jane",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: "name must be at most 100 characters" })
  @Matches(/^[\p{L}\p{M} \t'\-.]*$/u, {
    message:
      "name must contain only letters (including accented), spaces, apostrophes, hyphens, and periods",
  })
  @Expose()
  name?: string;
}
