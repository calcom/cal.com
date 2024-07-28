import { ApiProperty } from "@nestjs/swagger";
import { MembershipRole } from "@prisma/client";
import { Expose, Type } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, ValidateNested } from "class-validator";

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";

export class OrgTeamMembershipOutputDto {
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

export class OrgTeamMembershipsOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => OrgTeamMembershipOutputDto)
  @IsArray()
  data!: OrgTeamMembershipOutputDto[];
}

export class OrgTeamMembershipOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => OrgTeamMembershipOutputDto)
  data!: OrgTeamMembershipOutputDto;
}
