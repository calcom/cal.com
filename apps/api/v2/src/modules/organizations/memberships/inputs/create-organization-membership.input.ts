import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsEnum, IsInt } from "class-validator";

import { MembershipRole } from "@calcom/platform-libraries";

export class CreateOrgMembershipDto {
  @IsInt()
  @ApiProperty()
  readonly userId!: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean, default: false })
  readonly accepted?: boolean = false;

  @IsEnum(MembershipRole)
  @ApiProperty({
    enum: ["MEMBER", "OWNER", "ADMIN"],
    description: "If you are platform customer then managed users should only have MEMBER role.",
  })
  readonly role: MembershipRole = MembershipRole.MEMBER;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean, default: false })
  readonly disableImpersonation?: boolean = false;
}
