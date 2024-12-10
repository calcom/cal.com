import { ApiProperty } from "@nestjs/swagger";
import { MembershipRole } from "@prisma/client";
import { IsBoolean, IsOptional, IsEnum } from "class-validator";

export class UpdateTeamMembershipInput {
  @IsOptional()
  @IsBoolean()
  readonly accepted?: boolean = false;

  @IsEnum(MembershipRole)
  @ApiProperty({ enum: ["MEMBER", "OWNER", "ADMIN"] })
  readonly role?: MembershipRole = MembershipRole.MEMBER;

  @IsOptional()
  @IsBoolean()
  readonly disableImpersonation?: boolean = false;
}
