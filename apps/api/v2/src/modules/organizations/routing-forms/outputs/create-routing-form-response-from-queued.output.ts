import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsEnum, IsNumber, IsOptional } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class CreateRoutingFormResponseFromQueuedOutputData {
  @ApiProperty({
    type: Number,
    description: "The ID of the created form response",
    example: 123,
  })
  @IsNumber()
  @IsOptional()
  formResponseId?: number | null;
}

export class CreateRoutingFormResponseFromQueuedOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: CreateRoutingFormResponseFromQueuedOutputData })
  @Expose()
  data!: CreateRoutingFormResponseFromQueuedOutputData;
}
