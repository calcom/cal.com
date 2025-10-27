import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, ValidateNested, IsNumber, IsString, IsBoolean, IsArray } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

export class MeetingParticipant {
  @ApiProperty({ example: "user123", nullable: true })
  @IsString()
  userId!: string | null;

  @ApiProperty({ example: "participant456" })
  @IsString()
  participantId!: string;

  @ApiProperty({ example: "John Doe", nullable: true })
  @IsString()
  userName!: string | null;

  @ApiProperty({ example: 1678901234 })
  @IsNumber()
  joinTime!: number;

  @ApiProperty({ example: 3600 })
  @IsNumber()
  duration!: number;
}

export class MeetingSession {
  @ApiProperty({ example: "session123" })
  @IsString()
  id!: string;

  @ApiProperty({ example: "daily-video-room-123" })
  @IsString()
  room!: string;

  @ApiProperty({ example: 1678901234 })
  @IsNumber()
  startTime!: number;

  @ApiProperty({ example: 3600 })
  @IsNumber()
  duration!: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  ongoing!: boolean;

  @ApiProperty({ example: 10 })
  @IsNumber()
  maxParticipants!: number;

  @ApiProperty({ type: [MeetingParticipant] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeetingParticipant)
  participants!: MeetingParticipant[];
}

export class GetBookingVideoSessionsOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  error?: Error;

  @ApiProperty({ type: [MeetingSession] })
  @ValidateNested({ each: true })
  @Type(() => MeetingSession)
  data!: MeetingSession[];
}
