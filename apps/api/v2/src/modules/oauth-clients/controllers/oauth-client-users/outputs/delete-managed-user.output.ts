import { ManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/managed-user.output";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class DeleteManagedUserOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Type(() => ManagedUserOutput)
  @ValidateNested()
  data!: ManagedUserOutput;
}
