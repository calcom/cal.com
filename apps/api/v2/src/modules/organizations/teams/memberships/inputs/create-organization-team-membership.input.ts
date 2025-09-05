import { MembershipRole } from "@calcom/platform-libraries";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsInt, IsOptional } from "class-validator";

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
