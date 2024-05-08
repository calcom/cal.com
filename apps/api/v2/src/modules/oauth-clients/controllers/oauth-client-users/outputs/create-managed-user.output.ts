import { ManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/managed-user.output";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsString, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

class CreateManagedUserData {
  @ApiProperty({
    type: ManagedUserOutput,
  })
  @ValidateNested()
  @Type(() => ManagedUserOutput)
  user!: ManagedUserOutput;

  @IsString()
  accessToken!: string;

  @IsString()
  refreshToken!: string;
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
}
