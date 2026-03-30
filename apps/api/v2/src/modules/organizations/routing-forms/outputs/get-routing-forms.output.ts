import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsEnum } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class RoutingFormOutput {
  @Expose()
  id!: string;

  @ApiProperty({ example: "My Form" })
  @Expose()
  name!: string;

  @ApiProperty({ example: "This is the description.", type: String, nullable: true })
  @Expose()
  description!: string | null;

  @ApiProperty({ example: 0 })
  @Expose()
  position!: number;

  @ApiPropertyOptional({ type: Object, nullable: true, description: "Routing form routes configuration" })
  @Expose()
  routes!: Record<string, unknown> | null;

  @ApiProperty({ example: "2024-03-28T10:00:00.000Z", format: "date-time" })
  @Expose()
  createdAt!: string;

  @ApiProperty({ example: "2024-03-28T10:00:00.000Z", format: "date-time" })
  @Expose()
  updatedAt!: string;

  @ApiPropertyOptional({ type: Object, nullable: true, description: "Routing form fields configuration" })
  @Expose()
  fields!: Record<string, unknown> | null;

  @ApiProperty({ example: 2313 })
  @Expose()
  userId!: number;

  @ApiProperty({ example: 4214321, type: Number, nullable: true })
  @Expose()
  teamId!: number | null;

  @ApiProperty({ example: false })
  @Expose()
  disabled!: boolean;

  @ApiPropertyOptional({ type: Object, nullable: true, description: "Routing form settings" })
  @Expose()
  settings!: Record<string, unknown> | null;
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
