import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { PlatformOAuthClientDto } from "@calcom/platform-types";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEnum, ValidateNested } from "class-validator";

export class GetOAuthClientsResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: PlatformOAuthClientDto,
    isArray: true,
  })
  @ValidateNested({ each: true })
  @Type(() => PlatformOAuthClientDto)
  @IsArray()
  data!: PlatformOAuthClientDto[];
}
