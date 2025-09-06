import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsString, IsArray, IsInt } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class GetVerifiedEmailsOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsString()
  @Expose()
  readonly status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @IsArray()
  @IsInt({ each: true })
  @ApiProperty({ type: [String] })
  readonly data!: string[];
}
