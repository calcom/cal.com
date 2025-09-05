import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsBoolean, IsString, ValidateNested } from "class-validator";

export class VerifyEmailCodeData {
  @ApiProperty({ example: true })
  @IsBoolean()
  @Expose()
  readonly verified!: boolean;
}

export class VerifyEmailCodeOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsString()
  @Expose()
  readonly status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ValidateNested()
  @Type(() => VerifyEmailCodeData)
  @Expose()
  @ApiProperty({ type: VerifyEmailCodeData })
  readonly data!: VerifyEmailCodeData;
}
