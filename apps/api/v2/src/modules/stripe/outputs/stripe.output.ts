import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsString, ValidateNested, IsEnum } from "class-validator";

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";

export class StripConnectOutputDto {
  @IsString()
  @Expose()
  readonly authUrl!: string;
}

export class StripConnectOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => StripConnectOutputDto)
  data!: StripConnectOutputDto;
}

export class StripCredentialsCheckOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS })
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;
}

export class StripCredentialsSaveOutputResponseDto {
  @IsString()
  @Expose()
  readonly url!: string;
}
