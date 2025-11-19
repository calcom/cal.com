import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsEnum, IsInt } from "class-validator";

import { MembershipRole } from "@calcom/platform-libraries";

export class CreateOrgTeamMembershipDto {
  @IsInt()
  @ApiProperty()
  readonly userId!: number;

  @IsOptional()
  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsBoolean()
  readonly accepted?: boolean = false;

  @IsEnum(MembershipRole)
  @ApiProperty({ enum: ["MEMBER", "OWNER", "ADMIN"] })
  readonly role: MembershipRole = MembershipRole.MEMBER;

  @IsOptional()
  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsBoolean()
  readonly disableImpersonation?: boolean = false;
}
