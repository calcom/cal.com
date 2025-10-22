import { IsString, IsOptional, IsEnum, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CalendarType {
  PERSONAL = 'personal',
  TEAM = 'team',
  RESOURCE = 'resource',
}

export class CreateCalendarDto {
  @ApiProperty({
    description: 'The name of the calendar',
    example: 'My Work Calendar',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'The description of the calendar',
    example: 'Calendar for work-related events',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'The type of calendar',
    enum: CalendarType,
    example: CalendarType.PERSONAL,
    default: CalendarType.PERSONAL,
  })
  @IsEnum(CalendarType)
  @IsOptional()
  type?: CalendarType;

  @ApiPropertyOptional({
    description: 'The timezone of the calendar',
    example: 'America/New_York',
  })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'The color code for the calendar',
    example: '#FF5733',
  })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({
    description: 'Whether the calendar is public',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the calendar is the default calendar',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: 'Additional metadata for the calendar',
    example: { location: 'Office' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}