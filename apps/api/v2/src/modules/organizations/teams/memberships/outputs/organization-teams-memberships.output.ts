import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MembershipRole } from "@prisma/client";
import { Expose, Type } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, ValidateNested } from "class-validator";

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";

export class MembershipUserOutputDto {
  @IsOptional()
  @IsString()
  @Expose()
  @ApiPropertyOptional()
  readonly avatarUrl?: string;

  @IsOptional()
  @IsString()
  @Expose()
  @ApiPropertyOptional()
  readonly username?: string;

  @IsOptional()
  @IsString()
  @Expose()
  @ApiPropertyOptional()
  readonly name?: string;

  @IsBoolean()
  @Expose()
  @ApiProperty()
  readonly email!: string;
}

export class OrgTeamMembershipOutputDto {
  @IsInt()
  @Expose()
  @ApiProperty()
  readonly id!: number;

  @IsInt()
  @Expose()
  @ApiProperty()
  readonly userId!: number;

  @IsInt()
  @Expose()
  @ApiProperty()
  readonly teamId!: number;

  @IsBoolean()
  @Expose()
  @ApiProperty()
  readonly accepted!: boolean;

  @IsString()
  @ApiProperty({ enum: ["MEMBER", "OWNER", "ADMIN"] })
  @Expose()
  readonly role!: MembershipRole;

  @IsOptional()
  @IsBoolean()
  @Expose()
  @ApiPropertyOptional()
  readonly disableImpersonation?: boolean;

  @ValidateNested()
  @Type(() => MembershipUserOutputDto)
  @Expose()
  @ApiProperty({ type: MembershipUserOutputDto })
  user!: MembershipUserOutputDto;
}

export class OrgTeamMembershipsOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => OrgTeamMembershipOutputDto)
  @IsArray()
  @ApiProperty({ type: [OrgTeamMembershipOutputDto] })
  data!: OrgTeamMembershipOutputDto[];
}

export class OrgTeamMembershipOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => OrgTeamMembershipOutputDto)
  @ApiProperty({ type: OrgTeamMembershipOutputDto })
  data!: OrgTeamMembershipOutputDto;
}
