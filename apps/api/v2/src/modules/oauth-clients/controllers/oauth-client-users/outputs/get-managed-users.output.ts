import { ManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/managed-user.output";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEnum, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class GetManagedUsersOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ValidateNested({ each: true })
  @Type(() => ManagedUserOutput)
  @IsArray()
  data!: ManagedUserOutput[];
}
