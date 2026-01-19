import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreateOAuthClientOutput {
  @ApiProperty({
    example: "clsx38nbl0001vkhlwin9fmt0",
  })
  @IsString()
  clientId!: string;

  @ApiProperty({
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoib2F1dGgtY2xpZW50Iiwi",
  })
  @IsString()
  clientSecret!: string;
}
