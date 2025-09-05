import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsEnum } from "class-validator";

import { MembershipRole } from "@calcom/platform-libraries";

export class UpdateOrgTeamMembershipDto {
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  readonly accepted?: boolean;

  @IsOptional()
  @IsEnum(MembershipRole)
  @ApiPropertyOptional({ enum: ["MEMBER", "OWNER", "ADMIN"] })
  readonly role?: MembershipRole;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  readonly disableImpersonation?: boolean;
}
