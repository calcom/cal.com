import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsEnum } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class RoutingFormResponseOutput {
  @ApiProperty({ example: 0 })
  @Expose()
  id!: number;

  @ApiProperty({ example: "string" })
  @Expose()
  formId!: string;

  @ApiProperty({ example: "json" })
  @Expose()
  response!: any;

  @ApiProperty({ example: "2024-03-28T10:00:00.000Z" })
  @Expose()
  createdAt!: string;

  @ApiProperty({ example: "2024-03-28T10:00:00.000Z" })
  @Expose()
  updatedAt!: string;

  @ApiProperty({ example: "string" })
  @Expose()
  routedToBookingUid!: string | null;
}

export class UpdateRoutingFormResponseOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: RoutingFormResponseOutput })
  @Expose()
  @Type(() => RoutingFormResponseOutput)
  data!: RoutingFormResponseOutput;
}
