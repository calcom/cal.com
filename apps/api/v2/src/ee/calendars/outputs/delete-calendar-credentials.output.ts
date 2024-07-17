import { ApiProperty } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { Expose, Type } from "class-transformer";
import { IsString, ValidateNested, IsEnum, IsInt, IsBoolean, IsJSON } from "class-validator";

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";

class DeletedCalendarCredentialsOutputDto {
  @IsInt()
  @Expose()
  readonly id!: number;

  @IsString()
  @Expose()
  readonly type!: string;

  @IsJSON()
  @Expose()
  readonly key!: Prisma.JsonValue;

  @IsInt()
  @Expose()
  readonly userId!: number | null;

  @IsInt()
  @Expose()
  readonly teamId!: number | null;

  @IsString()
  @Expose()
  readonly appId!: string | null;

  @IsString()
  @Expose()
  readonly subscriptionId!: string | null;

  @IsString()
  @Expose()
  readonly paymentStatus!: string | null;

  @IsInt()
  @Expose()
  readonly billingCycleStart!: number | null;

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
