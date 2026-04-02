import { SlotFormat } from "@calcom/platform-enums";
import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import type { ValidationArguments, ValidatorConstraintInterface } from "class-validator";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Validate,
  ValidatorConstraint,
} from "class-validator";

@ValidatorConstraint({ name: "routingFormResponseIdValidator", async: false })
class RoutingFormResponseIdValidator implements ValidatorConstraintInterface {
  validate(routingFormResponseId: number, args: ValidationArguments) {
    if (routingFormResponseId === undefined) return true;

    const payload = args.object as GetAvailableSlotsInput_2024_04_15;

    if (payload._isDryRun) {
      return routingFormResponseId === 0;
    }

    return routingFormResponseId >= 1;
  }

  defaultMessage(args: ValidationArguments) {
    const payload = args.object as GetAvailableSlotsInput_2024_04_15;
    if (payload._isDryRun) {
      return "routingFormResponseId must be 0 for dry run";
    }
    return "routingFormResponseId must be a positive number";
  }
}

export class GetAvailableSlotsInput_2024_04_15 {
  @IsDateString({ strict: true })
  @ApiProperty({
    description: "Start date string starting from which to fetch slots in UTC timezone.",
    example: "2022-06-14T00:00:00.000Z",
  })
  startTime!: string;

  @IsDateString({ strict: true })
  @ApiProperty({
    description: "End date string until which to fetch slots in UTC timezone.",
    example: "2022-06-14T23:59:59.999Z",
  })
  endTime!: string;

  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: "Event Type ID for which slots are being fetched.", example: 100 })
  eventTypeId?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      "Slug of the event type for which slots are being fetched. If event slug is provided then username must be provided too as query parameter `usernameList[]=username`",
  })
  eventTypeSlug?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({
    type: [String],
    description:
      "Only if eventTypeSlug is provided or for dynamic events - list of usernames for which slots are being fetched.",
    example: "usernameList[]=bob",
  })
  usernameList?: string[];

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  debug?: boolean;

  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @IsOptional()
  @Min(1, { message: "Duration must be a positive number" })
  @ApiPropertyOptional({ description: "Only for dynamic events - length of returned slots." })
  duration?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: String, nullable: true })
  rescheduleUid?: string | null;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  timeZone?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: "Organization slug." })
  orgSlug?: string;

  @IsString()
  @IsEnum(SlotFormat, {
    message: "slotFormat must be either 'range' or 'time'",
  })
  @Transform(({ value }) => {
    if (!value) return undefined;
    return value.toLowerCase();
  })
  @IsOptional()
  @ApiPropertyOptional({
    description: "Format of slot times in response. Use 'range' to get start and end times.",
    example: "range",
    enum: SlotFormat,
  })
  slotFormat?: SlotFormat;

  // note(rajiv): after going through getUrlSearchParamsToForward.ts we found out
  // that the below properties were not being included inside getSlots :- cc @morgan
  // cal.salesforce.rrSkipToAccountLookupField, cal.rerouting, cal.routingFormResponseId, cal.reroutingFormResponses & cal.isTestPreviewLink
  // hence no input values have been setup for them in GetAvailableSlotsInput
  @Transform(({ value }) => value && value.toLowerCase() === "true")
  @IsBoolean()
  @IsOptional()
  @ApiHideProperty()
  skipContactOwner?: boolean;

  @Transform(({ value }) => value && value.toLowerCase() === "true")
  @IsBoolean()
  @IsOptional()
  @ApiHideProperty()
  shouldServeCache?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((s: string) => parseInt(s));
    }
    return value;
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @ApiHideProperty()
  routedTeamMemberIds?: number[];

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  teamMemberEmail?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  @ApiHideProperty()
  embedConnectVersion?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  @ApiHideProperty()
  email?: string | null;

  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @IsOptional()
  @Validate(RoutingFormResponseIdValidator)
  @ApiPropertyOptional()
  @ApiHideProperty()
  routingFormResponseId?: number;

  @Transform(({ value }) => value && value.toLowerCase() === "true")
  @IsBoolean()
  @IsOptional()
  @ApiHideProperty()
  _isDryRun?: boolean;

  @Transform(({ value }) => value && value.toLowerCase() === "true")
  @IsBoolean()
  @IsOptional()
  @ApiHideProperty()
  _bypassCalendarBusyTimes?: boolean;

  @Transform(({ value }) => value && value.toLowerCase() === "true")
  @IsBoolean()
  @IsOptional()
  @ApiHideProperty()
  _silentCalendarFailures?: boolean;

  @Transform(({ value }) => (value ? value.toLowerCase() === "true" : false))
  @IsBoolean()
  @IsOptional()
  @ApiHideProperty()
  isTeamEvent?: boolean;

  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @IsOptional()
  @ApiHideProperty()
  teamId?: number;

  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((id: string) => parseInt(id.trim(), 10));
    }
    if (Array.isArray(value)) {
      return value.map((id) => (typeof id === "string" ? parseInt(id, 10) : id));
    }
    return value;
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  /* @ApiPropertyOptional({
    type: [Number],
    description:
      "For round robin event types, filter available slots to only consider the specified subset of host user IDs. This allows you to get availability for specific hosts within a round robin event type.",
    example: [1, 2, 3],
  }) */
  @ApiHideProperty()
  rrHostSubsetIds?: number[];
}

export class RemoveSelectedSlotInput_2024_04_15 {
  @IsString()
  @IsOptional()
  @ApiProperty({
    description: "Unique identifier for the slot to be removed.",
    example: "e2a7bcf9-cc7b-40a0-80d3-657d391775a6",
    required: true,
  })
  uid?: string;
}

export class ReserveSlotInput_2024_04_15 {
  @IsInt()
  @ApiProperty({ description: "Event Type ID for which timeslot is being reserved.", example: 100 })
  eventTypeId!: number;

  @IsDateString()
  @ApiProperty({
    description: "Start date of the slot in UTC timezone.",
    example: "2022-06-14T00:00:00.000Z",
  })
  slotUtcStartDate!: string;

  @IsDateString()
  @ApiProperty({ description: "End date of the slot in UTC timezone.", example: "2022-06-14T00:30:00.000Z" })
  slotUtcEndDate!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: "Optional but only for events with seats. Used to retrieve booking of a seated event.",
  })
  bookingUid?: string;

  @IsBoolean()
  @IsOptional()
  @ApiHideProperty()
  _isDryRun?: boolean;
}
