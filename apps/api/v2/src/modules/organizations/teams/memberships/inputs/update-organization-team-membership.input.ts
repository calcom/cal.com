import { ApiPropertyOptional } from "@nestjs/swagger";
import { MembershipRole } from "@prisma/client";
import { IsBoolean, IsOptional, IsEnum } from "class-validator";

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
