import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsInt, IsDateString, IsOptional, IsArray } from "class-validator";

export class CossCreateEventInput {
  @IsInt()
  @ApiProperty({ example: 123 })
  calendarId!: number;

  @IsString()
  @ApiProperty({ example: "Team Meeting" })
  title!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  description?: string;

  @IsDateString()
  @ApiProperty({ example: "2024-01-15T10:00:00Z" })
  startTime!: string;

  @IsDateString()
  @ApiProperty({ example: "2024-01-15T11:00:00Z" })
  endTime!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  location?: string;
}

export class CossUpdateEventInput {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  title?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  location?: string;
}

export class CossCheckConflictsInput {
  @IsInt()
  @ApiProperty({ example: 1 })
  userId!: number;

  @IsDateString()
  @ApiProperty({ example: "2024-01-15T10:00:00Z" })
  startTime!: string;

  @IsDateString()
  @ApiProperty({ example: "2024-01-15T11:00:00Z" })
  endTime!: string;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @ApiPropertyOptional({ type: [Number] })
  calendarIds?: number[];
}
