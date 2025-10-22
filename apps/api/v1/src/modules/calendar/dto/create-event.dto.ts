import { IsString, IsNotEmpty, IsOptional, IsDateString, IsBoolean, IsArray, ValidateNested, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EventStatus {
  CONFIRMED = 'confirmed',
  TENTATIVE = 'tentative',
  CANCELLED = 'cancelled',
}

export enum EventVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  CONFIDENTIAL = 'confidential',
}

export enum ReminderMethod {
  EMAIL = 'email',
  POPUP = 'popup',
  SMS = 'sms',
}

export enum RecurrenceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum Weekday {
  MO = 'MO',
  TU = 'TU',
  WE = 'WE',
  TH = 'TH',
  FR = 'FR',
  SA = 'SA',
  SU = 'SU',
}

export class AttendeeDto {
  @ApiProperty({ description: 'Email address of the attendee' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ description: 'Display name of the attendee' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Whether the attendee is optional', default: false })
  @IsBoolean()
  @IsOptional()
  optional?: boolean;

  @ApiPropertyOptional({ description: 'Response status of the attendee' })
  @IsString()
  @IsOptional()
  responseStatus?: string;
}

export class ReminderDto {
  @ApiProperty({ description: 'Reminder method', enum: ReminderMethod })
  @IsEnum(ReminderMethod)
  @IsNotEmpty()
  method: ReminderMethod;

  @ApiProperty({ description: 'Minutes before the event to trigger the reminder' })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  minutes: number;
}

export class RecurrenceRuleDto {
  @ApiProperty({ description: 'Frequency of recurrence', enum: RecurrenceFrequency })
  @IsEnum(RecurrenceFrequency)
  @IsNotEmpty()
  frequency: RecurrenceFrequency;

  @ApiPropertyOptional({ description: 'Interval between recurrences', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  interval?: number;

  @ApiPropertyOptional({ description: 'Number of occurrences' })
  @IsInt()
  @Min(1)
  @IsOptional()
  count?: number;

  @ApiPropertyOptional({ description: 'End date for recurrence' })
  @IsDateString()
  @IsOptional()
  until?: string;

  @ApiPropertyOptional({ description: 'Days of the week for recurrence', type: [String], enum: Weekday })
  @IsArray()
  @IsEnum(Weekday, { each: true })
  @IsOptional()
  byDay?: Weekday[];

  @ApiPropertyOptional({ description: 'Days of the month for recurrence', type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(31, { each: true })
  @IsOptional()
  byMonthDay?: number[];

  @ApiPropertyOptional({ description: 'Months of the year for recurrence', type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(12, { each: true })
  @IsOptional()
  byMonth?: number[];
}

export class CreateEventDto {
  @ApiProperty({ description: 'Title of the event' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Description of the event' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Start date and time of the event in ISO 8601 format' })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ description: 'End date and time of the event in ISO 8601 format' })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @ApiPropertyOptional({ description: 'Location of the event' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'Whether the event is an all-day event', default: false })
  @IsBoolean()
  @IsOptional()
  allDay?: boolean;

  @ApiPropertyOptional({ description: 'Timezone of the event', default: 'UTC' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Status of the event', enum: EventStatus, default: EventStatus.CONFIRMED })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @ApiPropertyOptional({ description: 'Visibility of the event', enum: EventVisibility, default: EventVisibility.PUBLIC })
  @IsEnum(EventVisibility)
  @IsOptional()
  visibility?: EventVisibility;

  @ApiPropertyOptional({ description: 'List of attendees', type: [AttendeeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendeeDto)
  @IsOptional()
  attendees?: AttendeeDto[];

  @ApiPropertyOptional({ description: 'List of reminders', type: [ReminderDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReminderDto)
  @IsOptional()
  reminders?: ReminderDto[];

  @ApiPropertyOptional({ description: 'Recurrence rule for recurring events', type: RecurrenceRuleDto })
  @ValidateNested()
  @Type(() => RecurrenceRuleDto)
  @IsOptional()
  recurrence?: RecurrenceRuleDto;

  @ApiPropertyOptional({ description: 'Color code for the event' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Additional metadata as key-value pairs' })
  @IsOptional()
  metadata?: Record<string, any>;
}