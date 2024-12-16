import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MembershipRole } from "@prisma/client";
import { IsBoolean, IsOptional, IsEnum } from "class-validator";

export class UpdateOrgMembershipDto {
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean, default: false })
  readonly accepted?: boolean = false;

  @IsEnum(MembershipRole)
  @ApiProperty({ enum: ["MEMBER", "OWNER", "ADMIN"], required: true, default: "MEMBER" })
  readonly role?: MembershipRole = MembershipRole.MEMBER;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean, default: false })
  readonly disableImpersonation?: boolean = false;
}
