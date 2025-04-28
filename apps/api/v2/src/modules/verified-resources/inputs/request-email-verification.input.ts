import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsEmail } from "class-validator";

export class RequestEmailVerificationInput {
  @ApiProperty({
    type: String,
    required: false,
    description: "Email to verify.",
    example: "acme@example.com",
  })
  @IsEmail()
  @Expose()
  email!: string;
}
