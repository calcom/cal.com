import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsArray, IsString } from "class-validator";

export class GetVerifiedEmailsOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsString()
  @Expose()
  readonly status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ type: [String] })
  readonly data!: string[];
}
