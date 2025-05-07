import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class CreateCalendarCredentialsInput {
  @IsString()
  @MinLength(1)
  @ApiProperty()
  username!: string;

  @IsString()
  @MinLength(1)
  @ApiProperty()
  password!: string;
}
