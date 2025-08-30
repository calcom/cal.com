import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsNumber, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

class BookingsCount {
  @IsNumber()
  @ApiProperty({ example: 10 })
  count!: number;
}

export class GetBookingsCountOutput_2024_08_13 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: () => BookingsCount })
  @Type(() => BookingsCount)
  @ValidateNested()
  data!: BookingsCount;
}
