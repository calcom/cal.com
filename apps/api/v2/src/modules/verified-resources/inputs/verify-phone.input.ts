import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsEmail, IsPhoneNumber, IsString } from "class-validator";

export class VerifyPhoneInput {
  @ApiProperty({
    type: String,
    description: "phone number to verify.",
    example: "+37255556666",
  })
  @IsPhoneNumber()
  @Expose()
  phone!: string;

  @ApiProperty({
    type: String,
    description: "verification code sent to the phone number to verify",
    example: "1ABG2C",
  })
  @Expose()
  @IsString()
  code!: string;
}
