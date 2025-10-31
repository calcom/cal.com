import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConflictCheckDto {
  @ApiProperty({
    description: 'Calendar ID to check conflicts against',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  calendarId: string;

  @ApiProperty({
    description: 'Start time of the event to check',
    example: '2024-01-15T10:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({
    description: 'End time of the event to check',
    example: '2024-01-15T11:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @ApiPropertyOptional({
    description: 'Event ID to exclude from conflict check (for updates)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  @IsOptional()
  excludeEventId?: string;

  @ApiPropertyOptional({
    description: 'Timezone for the conflict check',
    example: 'America/New_York',
  })
  @IsString()
  @IsOptional()
  timezone?: string;
}

export class ConflictCheckResponseDto {
  @ApiProperty({
    description: 'Whether there are conflicts',
    example: true,
  })
  hasConflict: boolean;

  @ApiProperty({
    description: 'List of conflicting events',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174002' },
        title: { type: 'string', example: 'Team Meeting' },
        startTime: { type: 'string', example: '2024-01-15T10:30:00Z' },
        endTime: { type: 'string', example: '2024-01-15T11:30:00Z' },
      },
    },
  })
  conflicts: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
  }>;

  @ApiProperty({
    description: 'Total number of conflicts found',
    example: 1,
  })
  conflictCount: number;
}