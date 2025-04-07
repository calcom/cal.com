import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsEnum } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class RoutingFormOutput {
  @ApiProperty({ example: "string" })
  @Expose()
  id!: string;

  @ApiProperty({ example: "string" })
  @Expose()
  name!: string;

  @ApiProperty({ example: "string" })
  @Expose()
  description!: string | null;

  @ApiProperty({ example: 0 })
  @Expose()
  position!: number;

  @ApiProperty({ example: "json" })
  @Expose()
  routes!: any;

  @ApiProperty({ example: "2024-03-28T10:00:00.000Z" })
  @Expose()
  createdAt!: string;

  @ApiProperty({ example: "2024-03-28T10:00:00.000Z" })
  @Expose()
  updatedAt!: string;

  @ApiProperty({ example: "json" })
  @Expose()
  fields!: any;

  @ApiProperty({ example: 0 })
  @Expose()
  userId!: number;

  @ApiProperty({ example: 0 })
  @Expose()
  teamId!: number | null;

  @ApiProperty({ example: false })
  @Expose()
  disabled!: boolean;

  @ApiProperty({ example: "json" })
  @Expose()
  settings!: any;
}

export class GetRoutingFormsOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: [RoutingFormOutput] })
  @Expose()
  @Type(() => RoutingFormOutput)
  data!: RoutingFormOutput[];
}
