import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsEnum, IsInt } from "class-validator";

import { MembershipRole } from "@calcom/platform-libraries";

export class CreateTeamMembershipInput {
  @IsInt()
  @ApiProperty({ type: Number })
  readonly userId!: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean, default: false })
  readonly accepted?: boolean = false;

  @IsOptional()
  @IsEnum(MembershipRole)
  @ApiPropertyOptional({ enum: ["MEMBER", "OWNER", "ADMIN"], default: "MEMBER" })
  readonly role: MembershipRole = MembershipRole.MEMBER;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean, default: false })
  readonly disableImpersonation?: boolean = false;
}
