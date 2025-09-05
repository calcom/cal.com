import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, ValidateNested } from "class-validator";
import { ManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/managed-user.output";
import { KeysDto } from "@/modules/oauth-clients/controllers/oauth-flow/responses/KeysResponse.dto";

export class CreateManagedUserData extends KeysDto {
  @ApiProperty({
    type: ManagedUserOutput,
  })
  @ValidateNested()
  @Type(() => ManagedUserOutput)
  user!: ManagedUserOutput;
}

export class CreateManagedUserOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: CreateManagedUserData,
  })
  @ValidateNested()
  @Type(() => CreateManagedUserData)
  data!: CreateManagedUserData;

  error?: Error;
}
