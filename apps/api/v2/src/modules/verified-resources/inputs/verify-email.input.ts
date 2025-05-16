import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsEmail, IsString } from "class-validator";

export class VerifyEmailInput {
  @ApiProperty({
    type: String,
    description: "Email to verify.",
    example: "example@acme.com",
  })
  @IsEmail()
  @Expose()
  email!: string;

  @ApiProperty({
    type: String,
    description: "verification code sent to the email to verify",
    example: "1ABG2C",
  })
  @Expose()
  @IsString()
  code!: string;
}
