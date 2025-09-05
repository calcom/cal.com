import { MembershipRole } from "@calcom/platform-libraries";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsOptional } from "class-validator";

export class UpdateTeamMembershipInput {
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean })
  readonly accepted?: boolean;

  @IsOptional()
  @IsEnum(MembershipRole)
  @ApiPropertyOptional({ enum: ["MEMBER", "OWNER", "ADMIN"] })
  readonly role?: MembershipRole;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean })
  readonly disableImpersonation?: boolean;
}
