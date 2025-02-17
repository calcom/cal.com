import { RoutingFormOutput } from "@/modules/organizations/teams/routing-forms/outputs/routing-form.output";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsEnum } from "class-validator";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ERROR_STATUS } from "@calcom/platform-constants";

export class GetRoutingFormOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: RoutingFormOutput })
  @Expose()
  @Type(() => RoutingFormOutput)
  data!: RoutingFormOutput;
}
