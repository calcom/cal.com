import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsString, ValidateNested, IsBoolean } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class SendVerificationEmailData {
  @ApiProperty({ example: true })
  @IsBoolean()
  @Expose()
  readonly sent!: boolean;
}

export class SendVerificationEmailOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsString()
  @Expose()
  readonly status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ValidateNested()
  @Type(() => SendVerificationEmailData)
  @Expose()
  @ApiProperty({ type: SendVerificationEmailData })
  readonly data!: SendVerificationEmailData;
}
