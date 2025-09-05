import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsEnum } from "class-validator";

import { MembershipRole } from "@calcom/platform-libraries";

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
