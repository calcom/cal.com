import { CreateUserInput } from "@/modules/users/inputs/create-user.input";
import { IsString, IsOptional, IsBoolean } from "class-validator";

export class CreateOrganizationUserInput extends CreateUserInput {
  @IsOptional()
  @IsString()
  role?: string = "MEMBER";

  @IsOptional()
  @IsBoolean()
  autoAccept?: boolean = true;
}
