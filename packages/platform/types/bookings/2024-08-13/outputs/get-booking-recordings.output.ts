import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, ValidateNested, IsNumber, IsString, IsOptional, IsUrl } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class RecordingItem {
  @ApiProperty({ example: "1234567890" })
  @IsString()
  id!: string;

  @ApiProperty({ example: "daily-video-room-123" })
  @IsString()
  roomName!: string;

  @ApiProperty({ example: 1678901234 })
  @IsNumber()
  startTs!: number;

  @ApiProperty({ example: "completed" })
  @IsString()
  status!: string;

  @ApiProperty({ example: 10, required: false })
  @IsNumber()
  @IsOptional()
  maxParticipants?: number;

  @ApiProperty({ example: 3600 })
  @IsNumber()
  duration!: number;

  @ApiProperty({ example: "share-token-123" })
  @IsString()
  shareToken!: string;

  @ApiProperty({ example: "https://cal-video-recordings.s3.us-east-2.amazonaws.com/meetco/123s" })
  @IsUrl()
  @IsOptional()
  downloadLink?: string | null;

  @ApiProperty({ example: "Error message" })
  @IsString()
  @IsOptional()
  error?: string | null;
}

export class GetBookingRecordingsOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  error?: Error;

  @ValidateNested({ each: true })
  @Type(() => RecordingItem)
  data!: RecordingItem[];

  @ApiProperty({
    example: "This endpoint will require authentication in a future release.",
    required: false,
  })
  @IsString()
  @IsOptional()
  message?: string;
}
