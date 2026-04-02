import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsString } from "class-validator";

export class GetOrgRolePermissionsOutput {
  @ApiProperty({ example: SUCCESS_STATUS })
  status!: typeof SUCCESS_STATUS;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  data!: string[];
}
