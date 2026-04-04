import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsEnum, IsInt, IsString, ValidateNested } from "class-validator";

export class AppPushSubscriptionOutputDto {
  @IsInt()
  @Expose()
  readonly id!: number;

  @IsInt()
  @Expose()
  readonly userId!: number;

  @IsString()
  @Expose()
  readonly type!: string;

  @IsString()
  @Expose()
  readonly platform!: string;

  @IsString()
  @Expose()
  readonly identifier!: string;

  @IsString()
  @Expose()
  readonly deviceId!: string | null;

  @Expose()
  readonly createdAt!: Date;

  @Expose()
  readonly updatedAt!: Date;
}

export class AppPushSubscriptionResponseDto {
  @Expose()
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => AppPushSubscriptionOutputDto)
  data!: AppPushSubscriptionOutputDto;
}

export class RemoveAppPushSubscriptionResponseDto {
  @Expose()
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ApiProperty({ example: "App push subscription removed successfully" })
  @IsString()
  message!: string;
}
