import { IsString, IsOptional } from "class-validator";

import { CreateUserInput_2024_06_18 } from "../../../users";

export class CreateOrganizationUser_2024_06_18 extends CreateUserInput_2024_06_18 {
  @IsOptional()
  @IsString()
  role?: string = "MEMBER";

  @IsOptional()
  @IsBoolean()
  autoAccept?: boolean = true;
}
