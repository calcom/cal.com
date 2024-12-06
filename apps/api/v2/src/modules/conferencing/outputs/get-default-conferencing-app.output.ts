import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsEnum, IsOptional, IsString, ValidateNested } from "class-validator";

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";

export class DefaultConferencingAppsOutputDto {
  @IsString()
  @IsOptional()
  @Expose()
  readonly appSlug?: string;

  @IsString()
  @IsOptional()
  @Expose()
  readonly appLink?: string;
}

export class GetDefaultConferencingAppOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @IsOptional()
  @Type(() => DefaultConferencingAppsOutputDto)
  data?: DefaultConferencingAppsOutputDto;
}
