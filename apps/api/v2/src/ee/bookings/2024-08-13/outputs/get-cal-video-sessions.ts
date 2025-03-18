import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { Expose } from "class-transformer";
import { IsEnum, ValidateNested, IsNumber, IsString, IsBoolean, IsArray, IsOptional } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

class Participant {
  @ApiProperty({ type: String, nullable: true })
  @IsOptional()
  @Expose()
  user_id!: string | null;

  @ApiProperty({ type: String })
  @IsString()
  @Expose()
  participant_id!: string;

  @ApiProperty({ type: String })
  @IsString()
  @Expose()
  user_name!: string;

  @ApiProperty({ type: Number })
  @IsNumber()
  @Expose()
  join_time!: number;

  @ApiProperty({ type: Number })
  @IsNumber()
  @Expose()
  duration!: number;
}

class VideoSession {
  @ApiProperty({ type: String })
  @IsString()
  @Expose()
  id!: string;

  @ApiProperty({ type: String })
  @IsString()
  @Expose()
  room!: string;

  @ApiProperty({ type: Number })
  @IsNumber()
  @Expose()
  start_time!: number;

  @ApiProperty({ type: Number })
  @IsNumber()
  @Expose()
  duration!: number;

  @ApiProperty({ type: Number })
  @IsNumber()
  @Expose()
  max_participants!: number;

  @ApiProperty({ type: [Participant] })
  @ValidateNested({ each: true })
  @Type(() => Participant)
  @IsArray()
  @Expose()
  participants!: Participant[];

  @ApiProperty({ type: Boolean })
  @IsBoolean()
  @Expose()
  ongoing!: boolean;
}

class VideoSessionsWrapper {
  @ApiProperty({ type: Number })
  @IsNumber()
  @Expose()
  total_count!: number;

  @ApiProperty({ type: [VideoSession] })
  @ValidateNested({ each: true })
  @Type(() => VideoSession)
  @IsArray()
  @Expose()
  data!: VideoSession[];
}

export class GetCalVideoSessionsOutput_2024_08_13 {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: [VideoSessionsWrapper] })
  @ValidateNested({ each: true })
  @Type(() => VideoSessionsWrapper)
  @IsArray()
  @Expose()
  data!: VideoSessionsWrapper[];
}
