import { MembershipRole } from "@calcom/platform-libraries";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsOptional } from "class-validator";

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
