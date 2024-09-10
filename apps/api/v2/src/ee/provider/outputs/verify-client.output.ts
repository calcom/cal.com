import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsString } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class ProviderVerifyClientData {
  @IsString()
  clientId!: string;
  @IsNumber()
  organizationId!: number;
  @IsString()
  name!: string;
}
export class ProviderVerifyClientOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  data!: ProviderVerifyClientData;
}
