import { MembershipRole } from "@calcom/platform-libraries";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import { CreateUserInput } from "@/modules/users/inputs/create-user.input";

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
