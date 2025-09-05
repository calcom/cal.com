import { CreateUserInput } from "@/modules/users/inputs/create-user.input";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsBoolean, IsEnum } from "class-validator";

import { MembershipRole } from "@calcom/platform-libraries";

export class CreateOrganizationUserInput extends CreateUserInput {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: String, default: "en" })
  locale = "en";

  @IsOptional()
  @IsEnum(MembershipRole)
  @ApiPropertyOptional({ enum: MembershipRole, default: MembershipRole.MEMBER })
  organizationRole: MembershipRole = MembershipRole.MEMBER;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean, default: true })
  autoAccept = true;
}
