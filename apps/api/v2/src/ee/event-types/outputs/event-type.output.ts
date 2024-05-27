import {
  CREATE_EVENT_DESCRIPTION_EXAMPLE,
  CREATE_EVENT_LENGTH_EXAMPLE,
  CREATE_EVENT_SLUG_EXAMPLE,
  CREATE_EVENT_TITLE_EXAMPLE,
} from "@/ee/event-types/inputs/create-event-type.input";
import { PeriodType } from "@/ee/event-types/inputs/enums/period-type";
import { SchedulingType } from "@/ee/event-types/inputs/enums/scheduling-type";
import { EventTypeLocation } from "@/ee/event-types/inputs/event-type-location.input";
import {
  BookingField,
  IntervalLimits,
  RecurringEvent,
} from "@/ee/event-types/inputs/update-event-type.input";
import { ApiProperty as DocsProperty, ApiHideProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsJSON,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export class EventTypeOutput {
  @IsInt()
  @DocsProperty({ example: 1 })
  id!: number;

  @IsInt()
  @DocsProperty({ example: CREATE_EVENT_LENGTH_EXAMPLE })
  length!: number;

  @IsString()
  @DocsProperty({ example: CREATE_EVENT_SLUG_EXAMPLE })
  slug!: string;

  @IsString()
  @DocsProperty({ example: CREATE_EVENT_TITLE_EXAMPLE })
  title!: string;

  @IsString()
  @DocsProperty({ example: CREATE_EVENT_DESCRIPTION_EXAMPLE })
  description!: string | null;

  @IsBoolean()
  @ApiHideProperty()
  hidden!: boolean;

  @ValidateNested({ each: true })
  @Type(() => EventTypeLocation)
  @IsArray()
  locations!: EventTypeLocation[] | null;

  @IsInt()
  @ApiHideProperty()
  @IsOptional()
  position?: number;

  @IsInt()
  @ApiHideProperty()
  offsetStart!: number;

  @IsInt()
  @ApiHideProperty()
  userId!: number | null;

  @IsInt()
  @ApiHideProperty()
  @IsOptional()
  profileId?: number | null;

  @IsInt()
  @ApiHideProperty()
  teamId!: number | null;

  @IsString()
  @ApiHideProperty()
  eventName!: string | null;

  @IsInt()
  @ApiHideProperty()
  @IsOptional()
  parentId?: number | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingField)
  @ApiHideProperty()
  bookingFields!: BookingField[] | null;

  @IsString()
  @ApiHideProperty()
  timeZone!: string | null;

  @IsEnum(PeriodType)
  @ApiHideProperty()
  periodType!: PeriodType | null;

  @IsDate()
  @ApiHideProperty()
  periodStartDate!: Date | null;

  @IsDate()
  @ApiHideProperty()
  periodEndDate!: Date | null;

  @IsInt()
  @ApiHideProperty()
  periodDays!: number | null;

  @IsBoolean()
  @ApiHideProperty()
  periodCountCalendarDays!: boolean | null;

  @IsBoolean()
  @ApiHideProperty()
  lockTimeZoneToggleOnBookingPage!: boolean;

  @IsBoolean()
  @ApiHideProperty()
  requiresConfirmation!: boolean;

  @IsBoolean()
  @ApiHideProperty()
  requiresBookerEmailVerification!: boolean;

  @ValidateNested()
  @Type(() => RecurringEvent)
  @IsOptional()
  @ApiHideProperty()
  recurringEvent!: RecurringEvent | null;

  @IsBoolean()
  @ApiHideProperty()
  disableGuests!: boolean;

  @IsBoolean()
  @ApiHideProperty()
  hideCalendarNotes!: boolean;

  @IsInt()
  @ApiHideProperty()
  minimumBookingNotice!: number;

  @IsInt()
  @ApiHideProperty()
  beforeEventBuffer!: number;

  @IsInt()
  @ApiHideProperty()
  afterEventBuffer!: number;

  @IsInt()
  @ApiHideProperty()
  seatsPerTimeSlot!: number | null;

  @IsBoolean()
  @ApiHideProperty()
  onlyShowFirstAvailableSlot!: boolean;

  @IsBoolean()
  @ApiHideProperty()
  seatsShowAttendees!: boolean;

  @IsBoolean()
  @ApiHideProperty()
  seatsShowAvailabilityCount!: boolean;

  @IsEnum(SchedulingType)
  @ApiHideProperty()
  schedulingType!: SchedulingType | null;

  @IsInt()
  @ApiHideProperty()
  @IsOptional()
  scheduleId?: number | null;

  @IsNumber()
  @ApiHideProperty()
  price!: number;

  @IsString()
  @ApiHideProperty()
  currency!: string;

  @IsInt()
  @ApiHideProperty()
  slotInterval!: number | null;

  @IsJSON()
  @ApiHideProperty()
  metadata!: Record<string, any> | null;

  @IsString()
  @ApiHideProperty()
  successRedirectUrl!: string | null;

  @ValidateNested()
  @Type(() => IntervalLimits)
  @IsOptional()
  @ApiHideProperty()
  bookingLimits!: IntervalLimits;

  @ValidateNested()
  @Type(() => IntervalLimits)
  @ApiHideProperty()
  durationLimits!: IntervalLimits;

  @IsBoolean()
  @ApiHideProperty()
  isInstantEvent!: boolean;

  @IsBoolean()
  @ApiHideProperty()
  assignAllTeamMembers!: boolean;

  @IsBoolean()
  @ApiHideProperty()
  useEventTypeDestinationCalendarEmail!: boolean;

  @IsInt()
  @ApiHideProperty()
  secondaryEmailId!: number | null;
}
