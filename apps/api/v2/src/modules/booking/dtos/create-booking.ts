import { IsString } from "class-validator";

export class CreateBookingInput {
  @IsString()
  name: string;

  @IsString()
  email: string;

  @IsString()
  timezone: string;
}
