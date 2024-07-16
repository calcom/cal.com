import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsString, ValidateNested, IsEnum } from "class-validator";

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";

class DeletedCalendarCredentialsOutputDto {
  @IsString()
  @Expose()
  readonly message!: string;
}

export class DeletedCalendarCredentialsOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => DeletedCalendarCredentialsOutputDto)
  data!: DeletedCalendarCredentialsOutputDto;
}
