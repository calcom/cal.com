import { GetOrgUsersWithProfileOutput } from "@/modules/organizations/users/index/outputs/get-organization-users.output";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsArray, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class GetTeamUsersResponseDTO {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: [GetOrgUsersWithProfileOutput],
    description: "List of team users with their profiles",
  })
  @Type(() => GetOrgUsersWithProfileOutput)
  @IsArray()
  @ValidateNested({ each: true })
  data!: GetOrgUsersWithProfileOutput[];
}

export class GetTeamUserOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: GetOrgUsersWithProfileOutput,
    description: "Team user with profile",
  })
  @Type(() => GetOrgUsersWithProfileOutput)
  @ValidateNested()
  data!: GetOrgUsersWithProfileOutput;
}
