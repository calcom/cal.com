import { IsOptional, IsString } from "class-validator";

export class UpdateUserInput {
  @IsString()
  @IsOptional()
  email?: string;
}
