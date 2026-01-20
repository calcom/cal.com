import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, MinLength } from "class-validator";

export class CreateCalendarCredentialsInput {
  @IsString()
  @MinLength(1)
  @ApiProperty()
  @Transform(({ value }) => value?.trim())
  username!: string;

  @IsString()
  @MinLength(1)
  @ApiProperty()
  @Transform(({ value }) => value?.trim())
  password!: string;
}
