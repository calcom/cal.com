import { IsString } from "class-validator";

export class GetUserInput {
  @IsString()
  clientSecret!: string;
}
