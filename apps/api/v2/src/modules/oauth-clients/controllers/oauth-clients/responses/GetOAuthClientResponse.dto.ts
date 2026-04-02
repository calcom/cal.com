import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { PlatformOAuthClientDto } from "@calcom/platform-types";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsNotEmptyObject, ValidateNested } from "class-validator";

export class GetOAuthClientResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: PlatformOAuthClientDto })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => PlatformOAuthClientDto)
  data!: PlatformOAuthClientDto;
}
