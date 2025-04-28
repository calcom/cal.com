import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsEmail } from "class-validator";

export class VerifyPhoneInput {
  @ApiProperty({
    type: String,
    required: false,
    description: "phone number to verify.",
    example: "+37255556666",
  })
  @IsEmail()
  @Expose()
  phone!: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "verification code sent to the phone number to verify",
    example: "1ABG2C",
  })
  @IsEmail()
  @Expose()
  code!: string;
}
