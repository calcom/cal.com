import { ApiProperty } from "@nestjs/swagger";
import { MembershipRole } from "@prisma/client";
import { Expose } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString } from "class-validator";

export class TeamMembershipOutput {
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
  @ApiProperty({ enum: ["MEMBER", "OWNER", "ADMIN"] })
  @Expose()
  readonly role!: MembershipRole;

  @IsOptional()
  @IsBoolean()
  @Expose()
  readonly disableImpersonation?: boolean;
}
