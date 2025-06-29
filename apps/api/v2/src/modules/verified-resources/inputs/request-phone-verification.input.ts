import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsPhoneNumber } from "class-validator";

export class RequestPhoneVerificationInput {
  @ApiProperty({
    type: String,
    description: "Phone number to verify.",
    example: "+372 5555 6666",
  })
  @IsPhoneNumber()
  @Expose()
  phone!: string;
}
