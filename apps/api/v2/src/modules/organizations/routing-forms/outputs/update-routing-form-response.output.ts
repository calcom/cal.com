import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsEnum } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";
import { RoutingFormResponseOutput } from "@calcom/platform-types";

export class UpdateRoutingFormResponseOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: RoutingFormResponseOutput })
  @Expose()
  @Type(() => RoutingFormResponseOutput)
  data!: RoutingFormResponseOutput;
}
