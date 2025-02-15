import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsEnum } from "class-validator";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ERROR_STATUS } from "@calcom/platform-constants";

import { RoutingFormResponseDto } from "./routing-form-response.output";

export class GetRoutingFormResponsesOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: [RoutingFormResponseDto] })
  @Expose()
  @Type(() => RoutingFormResponseDto)
  data!: RoutingFormResponseDto[];
}
