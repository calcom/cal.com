import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsInt, IsString, ValidateNested, IsEnum } from "class-validator";

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";

export class SelectedCalendarOutputDto {
  @IsInt()
  @Expose()
  readonly userId!: number;

  @IsString()
  @Expose()
  readonly integration!: string;

  @IsString()
  @Expose()
  readonly externalId!: string;

  @IsInt()
  @Expose()
  readonly credentialId!: number | null;
}

export class SelectedCalendarOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => SelectedCalendarOutputDto)
  data!: SelectedCalendarOutputDto;
}
