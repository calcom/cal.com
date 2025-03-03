import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsString, ValidateNested, IsOptional } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

class Data {
  @IsString()
  @ApiProperty()
  callId!: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  agentId?: string;
}

export class CreatePhoneCallOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: Data,
  })
  @ValidateNested()
  @Type(() => Data)
  data!: Data;
}
