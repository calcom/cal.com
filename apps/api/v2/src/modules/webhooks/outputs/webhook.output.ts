import { ApiProperty } from "@nestjs/swagger";
import { WebhookTriggerEvents } from "@prisma/client";
import { Expose, Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class WebhookOutputDto {
  @IsInt()
  @Expose()
  readonly id!: number;

  @IsString()
  @IsOptional()
  @Expose()
  readonly appId?: string;

  @IsInt()
  @Expose()
  readonly userId!: number;

  @IsInt()
  @Expose()
  @IsOptional()
  readonly teamId?: number;

  @IsInt()
  @IsOptional()
  @Expose()
  readonly eventTypeId?: number;

  @IsString()
  @Expose()
  readonly payloadTemplate!: string;

  @IsEnum(WebhookTriggerEvents)
  readonly eventTriggers!: WebhookTriggerEvents[];

  @IsString()
  @Expose()
  readonly subscriberUrl!: string;

  @IsBoolean()
  @Expose()
  readonly active!: boolean;
}

export class WebhookOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => WebhookOutputDto)
  data!: WebhookOutputDto;
}

export class WebhooksOutputResponseDto {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @Expose()
  @ValidateNested()
  @Type(() => WebhookOutputDto)
  data!: WebhookOutputDto[];
}
