import { IsOptional, IsDateString, IsInt, Min, IsEnum, IsArray, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum TimeUnit {
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
}

export class AvailabilityQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for availability query',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for availability query',
    example: '2024-01-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Duration of the event in specified time units',
    example: 30,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Time unit for duration',
    enum: TimeUnit,
    example: TimeUnit.MINUTES,
  })
  @IsOptional()
  @IsEnum(TimeUnit)
  timeUnit?: TimeUnit;

  @ApiPropertyOptional({
    description: 'Timezone for availability calculation',
    example: 'America/New_York',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Array of calendar IDs to check availability for',
    type: [String],
    example: ['cal_123', 'cal_456'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  calendarIds?: string[];

  @ApiPropertyOptional({
    description: 'Minimum time between events in minutes',
    example: 15,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bufferTime?: number;

  @ApiPropertyOptional({
    description: 'Slot interval in minutes',
    example: 15,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  slotInterval?: number;
}