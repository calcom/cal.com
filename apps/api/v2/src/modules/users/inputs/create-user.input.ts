import { IsString } from "class-validator";

export class CreateUserInput {
  @IsString()
  email!: string;
}
