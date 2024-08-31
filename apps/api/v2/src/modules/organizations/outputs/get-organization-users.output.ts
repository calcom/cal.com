import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { GetUserOutput } from "src/modules/users/outputs/get-users.output";

import { ERROR_STATUS } from "@calcom/platform-constants";
import { SUCCESS_STATUS } from "@calcom/platform-constants";

export class GetOrganizationUsersOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;
  data!: GetUserOutput[];
}

export class GetOrganizationUserOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;
  data!: GetUserOutput;
}
