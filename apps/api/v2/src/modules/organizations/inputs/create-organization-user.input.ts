import { CreateUserInput } from "@/modules/users/inputs/create-user.input";
import { MembershipRole } from "@prisma/client";
import { IsString, IsOptional, IsBoolean, IsEnum } from "class-validator";

export class CreateOrganizationUserInput extends CreateUserInput {
  @IsOptional()
  @IsString()
  locale = "en";

  @IsOptional()
  @IsEnum(MembershipRole)
  organizationRole: MembershipRole = MembershipRole.MEMBER;

  @IsOptional()
  @IsBoolean()
  autoAccept = true;
}
