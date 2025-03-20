import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsNotEmptyObject, ValidateNested, IsArray } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

import { OrgMembershipOutputDto } from "../../../organizations/memberships/outputs/membership.output";

export class GetAllOrgMemberships {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: OrgMembershipOutputDto,
  })
  @IsNotEmptyObject()
  @ValidateNested({ each: true })
  @Type(() => OrgMembershipOutputDto)
  @IsArray()
  data!: OrgMembershipOutputDto[];
}
