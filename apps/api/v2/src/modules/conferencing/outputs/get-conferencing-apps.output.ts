import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsString, ValidateNested, IsEnum, IsNumber, IsOptional, IsBoolean } from "class-validator";

import { ERROR_STATUS, GOOGLE_MEET_TYPE, SUCCESS_STATUS } from "@calcom/platform-constants";

export class ConferencingAppsOutputDto {
  @Expose()
  @IsNumber()
  @ApiProperty({ description: "Id of the conferencing app credentials" })
  id!: number;

  @ApiProperty({ example: GOOGLE_MEET_TYPE, description: "Type of conferencing app" })
  @Expose()
  @IsString()
  type!: string;

  @ApiProperty({ description: "Id of the user associated to the conferencing app" })
  @Expose()
  @IsNumber()
  userId!: number;

  @ApiProperty({ example: true, description: "Whether if the connection is working or not." })
  @Expose()
  @IsBoolean()
  @IsOptional()
  invalid?: boolean | null;
}

export class ConferencingAppsOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => ConferencingAppsOutputDto)
  data!: ConferencingAppsOutputDto[];
}

export class ConferencingAppOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => ConferencingAppsOutputDto)
  data!: ConferencingAppsOutputDto;
}

export class DisconnectConferencingAppOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;
}
