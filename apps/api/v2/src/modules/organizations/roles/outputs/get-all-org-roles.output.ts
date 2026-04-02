import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEnum, ValidateNested } from "class-validator";
import { OrgRoleOutput } from "@/modules/organizations/roles/outputs/org-role.output";

export class GetAllOrgRolesOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: [OrgRoleOutput],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrgRoleOutput)
  data!: OrgRoleOutput[];
}
