import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsDate, IsEnum, IsOptional, IsString, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class BusyTimesOutput {
  @IsDate()
  start!: Date;

  @IsDate()
  end!: Date;

  @IsOptional()
  @IsString()
  source?: string | null;
}

export class GetBusyTimesOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ValidateNested()
  @Type(() => BusyTimesOutput)
  @IsArray()
  data!: BusyTimesOutput[];
}
