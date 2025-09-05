import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsEnum, ValidateNested } from "class-validator";
import { ApiKeyOutput } from "@/modules/api-keys/outputs/api-key.output";

export class RefreshApiKeyOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: ApiKeyOutput })
  @Expose()
  @ValidateNested()
  @Type(() => ApiKeyOutput)
  data!: ApiKeyOutput;
}
