import { DelegationCredentialOutput } from "@/modules/organizations/delegation-credentials/outputs/delegation-credential.output";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsNotEmptyObject, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class UpdateDelegationCredentialOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: DelegationCredentialOutput,
  })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => DelegationCredentialOutput)
  data!: DelegationCredentialOutput;
}
