import { OrganizationMembershipOutput } from "@/modules/organizations/memberships/outputs/organization-membership.output";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsNotEmptyObject, ValidateNested, IsArray } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class GetAllOrgMemberships {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: OrganizationMembershipOutput,
  })
  @IsNotEmptyObject()
  @ValidateNested({ each: true })
  @Type(() => OrganizationMembershipOutput)
  @IsArray()
  data!: OrganizationMembershipOutput[];
}
