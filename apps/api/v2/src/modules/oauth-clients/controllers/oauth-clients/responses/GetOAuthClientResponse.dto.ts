import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ValidateNested, IsEnum, IsNotEmptyObject } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";
import { PlatformOAuthClientDto } from "@calcom/platform-types";

export class GetOAuthClientResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: PlatformOAuthClientDto })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => PlatformOAuthClientDto)
  data!: PlatformOAuthClientDto;
}
