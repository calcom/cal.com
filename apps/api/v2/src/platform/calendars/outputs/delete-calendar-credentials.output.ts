import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsString, ValidateNested, IsEnum, IsInt, IsBoolean } from "class-validator";

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";

export class DeletedCalendarCredentialsOutputDto {
  @IsInt()
  @Expose()
  readonly id!: number;

  @IsString()
  @Expose()
  readonly type!: string;

  @IsInt()
  @Expose()
  readonly userId!: number | null;

  @IsInt()
  @Expose()
  readonly teamId!: number | null;

  @IsString()
  @Expose()
  readonly appId!: string | null;

  @IsBoolean()
  @Expose()
  readonly invalid!: boolean | null;
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
