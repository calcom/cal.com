import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsOptional, IsString, ValidateNested } from "class-validator";

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
