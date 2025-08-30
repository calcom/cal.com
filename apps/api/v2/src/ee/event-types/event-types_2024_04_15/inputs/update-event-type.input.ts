import { Editable } from "@/ee/event-types/event-types_2024_04_15/inputs/enums/editable";
import { BaseField } from "@/ee/event-types/event-types_2024_04_15/inputs/enums/field-type";
import { Frequency } from "@/ee/event-types/event-types_2024_04_15/inputs/enums/frequency";
import { EventTypeLocation_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/inputs/event-type-location.input";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsBoolean,
  IsOptional,
  ValidateNested,
  Min,
  Max,
  IsInt,
  IsEnum,
  IsArray,
  IsDate,
  IsNumber,
} from "class-validator";

import { MAX_SEATS_PER_TIME_SLOT } from "@calcom/platform-constants";

// note(Lauris): We will gradually expose more properties if any customer needs them.
// Just uncomment any below when requested. Go to bottom of file to see UpdateEventTypeInput.

class Option {
  @IsString()
  @ApiProperty()
  value!: string;

  @IsString()
  @ApiProperty()
  label!: string;
}

class Source {
  @IsString()
  @ApiProperty()
  id!: string;

  @IsString()
  @ApiProperty()
  type!: string;

  @IsString()
  @ApiProperty()
  label!: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  editUrl?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  fieldRequired?: boolean;
}

class View {
  @IsString()
  @ApiProperty()
  id!: string;

  @IsString()
  @ApiProperty()
  label!: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  description?: string;
}

class OptionsInput {
  @IsString()
  @ApiProperty({
    description: 'Type of the field, can be one of "address", "text", or "phone".',
    enum: ["address", "text", "phone"],
    example: "text",
  })
  type!: "address" | "text" | "phone";

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  required?: boolean;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  placeholder?: string;
}

class VariantField {
  @IsString()
  @ApiProperty()
  type!: BaseField;

  @IsString()
  @ApiProperty()
  name!: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  label?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  labelAsSafeHtml?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  placeholder?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  required?: boolean;
}

class Variant {
  @ValidateNested({ each: true })
  @Type(() => VariantField)
  @ApiProperty({ type: [VariantField] })
  fields!: VariantField[];
}

class VariantsConfig {
  @ApiProperty({ type: Object })
  variants!: Record<string, Variant>;
}

export class BookingField_2024_04_15 {
  @IsEnum(BaseField)
  @ApiProperty({ enum: BaseField })
  type!: BaseField;

  @IsString()
  @ApiProperty()
  name!: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Option)
  @ApiPropertyOptional({ type: [Option] })
  options?: Option[];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  label?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  labelAsSafeHtml?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  defaultLabel?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  placeholder?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  required?: boolean;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  getOptionsAt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionsInput)
  @ApiPropertyOptional()
  optionsInputs?: Record<string, OptionsInput>;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  variant?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => VariantsConfig)
  @ApiPropertyOptional({ type: VariantsConfig })
  variantsConfig?: VariantsConfig;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => View)
  @ApiPropertyOptional({ type: [View] })
  views?: View[];

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  hideWhenJustOneOption?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  hidden?: boolean;

  @IsOptional()
  @IsEnum(Editable)
  @ApiPropertyOptional()
  editable?: Editable;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Source)
  @ApiPropertyOptional({ type: [Source] })
  sources?: Source[];

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  disableOnPrefill?: boolean;
}

export class RecurringEvent_2024_04_15 {
  @IsDate()
  @IsOptional()
  @ApiPropertyOptional({ type: Date })
  dtstart?: Date;

  @IsInt()
  @ApiProperty()
  interval!: number;

  @IsInt()
  @ApiProperty()
  count!: number;

  @IsEnum(Frequency)
  @ApiProperty({ enum: Frequency })
  freq!: Frequency;

  @IsDate()
  @IsOptional()
  @ApiPropertyOptional({ type: Date })
  until?: Date;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  tzid?: string;
}

export class IntervalLimits_2024_04_15 {
  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional()
  PER_DAY?: number;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional()
  PER_WEEK?: number;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional()
  PER_MONTH?: number;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional()
  PER_YEAR?: number;
}

export class UpdateEventTypeInput_2024_04_15 {
  @IsInt()
  @Min(1)
  @IsOptional()
  @ApiPropertyOptional()
  length?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  title?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  hidden?: boolean;

  @ValidateNested({ each: true })
  @Type(() => EventTypeLocation_2024_04_15)
  @IsOptional()
  @ApiPropertyOptional({ type: [EventTypeLocation_2024_04_15] })
  locations?: EventTypeLocation_2024_04_15[];

  // @IsInt()
  // @IsOptional()
  // position?: number;

  // @IsInt()
  // @IsOptional()
  // offsetStart?: number;

  // @IsInt()
  // @IsOptional()
  // userId?: number;

  // @IsInt()
  // @IsOptional()
  // profileId?: number;

  // @IsInt()
  // @IsOptional()
  // teamId?: number;

  // @IsString()
  // @IsOptional()
  // eventName?: string;

  // @IsInt()
  // @IsOptional()
  // parentId?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingField_2024_04_15)
  @ApiPropertyOptional({ type: [BookingField_2024_04_15] })
  bookingFields?: BookingField_2024_04_15[];

  // @IsString()
  // @IsOptional()
  // timeZone?: string;

  // @IsEnum(PeriodType)
  // @IsOptional()
  // periodType?: PeriodType; -> import { PeriodType } from "@/ee/event-types/inputs/enums/period-type";

  // @IsDate()
  // @IsOptional()
  // periodStartDate?: Date;

  // @IsDate()
  // @IsOptional()
  // periodEndDate?: Date;

  // @IsInt()
  // @IsOptional()
  // periodDays?: number;

  // @IsBoolean()
  // @IsOptional()
  // periodCountCalendarDays?: boolean;

  // @IsBoolean()
  // @IsOptional()
  // lockTimeZoneToggleOnBookingPage?: boolean;

  // @IsBoolean()
  // @IsOptional()
  // requiresConfirmation?: boolean;

  // @IsBoolean()
  // @IsOptional()
  // requiresBookerEmailVerification?: boolean;

  // @ValidateNested()
  // @Type(() => RecurringEvent)
  // @IsOptional()
  // recurringEvent?: RecurringEvent;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  disableGuests?: boolean;

  // @IsBoolean()
  // @IsOptional()
  // hideCalendarNotes?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional()
  minimumBookingNotice?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional()
  beforeEventBuffer?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional()
  afterEventBuffer?: number;

  @IsInt()
  @Min(1)
  @Max(MAX_SEATS_PER_TIME_SLOT)
  @IsOptional()
  @ApiPropertyOptional()
  seatsPerTimeSlot?: number;

  // @IsBoolean()
  // @IsOptional()
  // onlyShowFirstAvailableSlot?: boolean;

  // @IsBoolean()
  // @IsOptional()
  // seatsShowAttendees?: boolean;

  // @IsBoolean()
  // @IsOptional()
  // seatsShowAvailabilityCount?: boolean;

  // @IsEnum(SchedulingType)
  // @IsOptional()
  // schedulingType?: SchedulingType; -> import { SchedulingType } from "@/ee/event-types/inputs/enums/scheduling-type";

  // @IsInt()
  // @IsOptional()
  // scheduleId?: number;

  // @IsInt()
  // @IsOptional()
  // price?: number;

  // @IsString()
  // @IsOptional()
  // currency?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional()
  slotInterval?: number;

  // @IsString()
  // @IsOptional()
  // @IsUrl()
  // successRedirectUrl?: string;

  // @ValidateNested()
  // @Type(() => IntervalLimits)
  // @IsOptional()
  // bookingLimits?: IntervalLimits;

  // @ValidateNested()
  // @Type(() => IntervalLimits)
  // @IsOptional()
  // durationLimits?: IntervalLimits;

  // @IsBoolean()
  // @IsOptional()
  // isInstantEvent?: boolean;

  // @IsBoolean()
  // @IsOptional()
  // assignAllTeamMembers?: boolean;

  // @IsBoolean()
  // @IsOptional()
  // useEventTypeDestinationCalendarEmail?: boolean;

  // @IsInt()
  // @IsOptional()
  // secondaryEmailId?: number;
}
