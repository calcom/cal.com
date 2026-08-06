import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsInt, IsOptional, IsString, ValidateNested, IsEnum } from "class-validator";

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";

export class DestinationCalendarsOutputDto {
  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ type: Number, nullable: true })
  @Expose()
  readonly userId!: number | null;

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

export class DestinationCalendarsOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => DestinationCalendarsOutputDto)
  data!: DestinationCalendarsOutputDto;
}
