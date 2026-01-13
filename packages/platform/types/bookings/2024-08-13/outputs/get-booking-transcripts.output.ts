import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEnum, IsString } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class GetBookingTranscriptsOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  error?: Error;

  @ApiProperty({ type: [String], example: ["https://transcript1.com", "https://transcript2.com"] })
  @IsArray()
  @IsString({ each: true })
  data!: string[];
}
