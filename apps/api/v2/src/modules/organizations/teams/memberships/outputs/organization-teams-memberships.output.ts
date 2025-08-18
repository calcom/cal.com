import { TeamMembershipOutput } from "@/modules/teams/memberships/outputs/team-membership.output";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsArray, IsEnum, ValidateNested } from "class-validator";

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";

export class OrgTeamMembershipsOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => TeamMembershipOutput)
  @IsArray()
  @ApiProperty({ type: [TeamMembershipOutput] })
  data!: TeamMembershipOutput[];
}

export class OrgTeamMembershipOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => TeamMembershipOutput)
  @ApiProperty({ type: TeamMembershipOutput })
  data!: TeamMembershipOutput;
}
