import { IsBoolean, IsOptional, IsString, IsInt } from "class-validator";

import { MembershipRole } from "@calcom/prisma/enums";

export class CreateOrgMembershipDto {
  @IsInt()
  readonly teamId!: number;

  @IsInt()
  readonly userId!: number;

  @IsOptional()
  @IsBoolean()
  readonly accepted?: boolean = false;

  @IsString()
  readonly role: MembershipRole = MembershipRole.MEMBER;

  @IsOptional()
  @IsBoolean()
  readonly disableImpersonation?: boolean = false;
}
