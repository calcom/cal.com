import { Expose } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString } from "class-validator";

import { MembershipRole } from "@calcom/prisma/enums";

export class OrgMembershipOutputDto {
  @IsInt()
  @Expose()
  readonly id!: number;

  @IsInt()
  @Expose()
  readonly userId!: number;

  @IsInt()
  @Expose()
  readonly teamId!: number;

  @IsBoolean()
  @Expose()
  readonly accepted!: boolean;

  @IsString()
  @Expose()
  readonly role!: MembershipRole;

  @IsOptional()
  @IsBoolean()
  @Expose()
  readonly disableImpersonation?: boolean;
}
