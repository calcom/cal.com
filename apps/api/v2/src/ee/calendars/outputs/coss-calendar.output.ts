import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsBoolean, IsArray } from "class-validator";
import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class CossCalendarOutput {
  @ApiProperty({ enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty()
  data!: any;
}

export class CossConflictOutput {
  @ApiProperty({ enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty()
  data!: {
    hasConflict: boolean;
    conflicts: any[];
  };
}
