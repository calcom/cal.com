import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsEmail } from "class-validator";

export class VerifyEmailInput {
  @ApiProperty({
    type: String,
    required: false,
    description: "Email to verify.",
    example: "https://example.com/avatar.jpg",
  })
  @IsEmail()
  @Expose()
  email!: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "verification code sent to the email to verify",
    example: "1ABG2C",
  })
  @IsEmail()
  @Expose()
  code!: string;
}
