import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsNumber, IsString, ValidateNested } from "class-validator";

import { TimeUnit, WorkflowTriggerEvents } from "@calcom/platform-libraries";

export const BEFORE_EVENT = "beforeEvent";
export const EVENT_CANCELLED = "eventCancelled";
export const NEW_EVENT = "newEvent";
export const AFTER_EVENT = "afterEvent";
export const RESCHEDULE_EVENT = "rescheduleEvent";
export const AFTER_HOSTS_CAL_VIDEO_NO_SHOW = "afterHostsCalVideoNoShow";
export const AFTER_GUESTS_CAL_VIDEO_NO_SHOW = "afterGuestsCalVideoNoShow";
export const BOOKING_REJECTED = "bookingRejected";
export const BOOKING_REQUESTED = "bookingRequested";
export const BOOKING_PAYMENT_INITIATED = "bookingPaymentInitiated";
export const BOOKING_PAID = "bookingPaid";
export const BOOKING_NO_SHOW_UPDATED = "bookingNoShowUpdated";
export const WORKFLOW_TRIGGER_TYPES = [
  BEFORE_EVENT,
  EVENT_CANCELLED,
  NEW_EVENT,
  AFTER_EVENT,
  RESCHEDULE_EVENT,
  AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
  AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
  BOOKING_REJECTED,
  BOOKING_REQUESTED,
  BOOKING_PAYMENT_INITIATED,
  BOOKING_PAID,
  BOOKING_NO_SHOW_UPDATED,
] as const;

export const WORKFLOW_TRIGGER_TO_ENUM = {
  [BEFORE_EVENT]: WorkflowTriggerEvents.BEFORE_EVENT,
  [EVENT_CANCELLED]: WorkflowTriggerEvents.EVENT_CANCELLED,
  [NEW_EVENT]: WorkflowTriggerEvents.NEW_EVENT,
  [AFTER_EVENT]: WorkflowTriggerEvents.AFTER_EVENT,
  [RESCHEDULE_EVENT]: WorkflowTriggerEvents.RESCHEDULE_EVENT,
  [AFTER_HOSTS_CAL_VIDEO_NO_SHOW]: WorkflowTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
  [AFTER_GUESTS_CAL_VIDEO_NO_SHOW]: WorkflowTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
  [BOOKING_REJECTED]: WorkflowTriggerEvents.BOOKING_REJECTED,
  [BOOKING_REQUESTED]: WorkflowTriggerEvents.BOOKING_REQUESTED,
  [BOOKING_PAYMENT_INITIATED]: WorkflowTriggerEvents.BOOKING_PAYMENT_INITIATED,
  [BOOKING_NO_SHOW_UPDATED]: WorkflowTriggerEvents.BOOKING_NO_SHOW_UPDATED,
  [BOOKING_PAID]: WorkflowTriggerEvents.BOOKING_PAID,
} as const;

export const ENUM_TO_WORKFLOW_TRIGGER = {
  [WorkflowTriggerEvents.BEFORE_EVENT]: BEFORE_EVENT,
  [WorkflowTriggerEvents.EVENT_CANCELLED]: EVENT_CANCELLED,
  [WorkflowTriggerEvents.NEW_EVENT]: NEW_EVENT,
  [WorkflowTriggerEvents.AFTER_EVENT]: AFTER_EVENT,
  [WorkflowTriggerEvents.RESCHEDULE_EVENT]: RESCHEDULE_EVENT,
  [WorkflowTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW]: AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
  [WorkflowTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW]: AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
  [WorkflowTriggerEvents.BOOKING_REJECTED]: BOOKING_REJECTED,
  [WorkflowTriggerEvents.BOOKING_REQUESTED]: BOOKING_REQUESTED,
  [WorkflowTriggerEvents.BOOKING_PAYMENT_INITIATED]: BOOKING_PAYMENT_INITIATED,
  [WorkflowTriggerEvents.BOOKING_PAID]: BOOKING_PAID,
  [WorkflowTriggerEvents.BOOKING_NO_SHOW_UPDATED]: BOOKING_NO_SHOW_UPDATED,
} as const;

export const HOUR = "hour";
export const MINUTE = "minute";
export const DAY = "day";

export const TIME_UNITS = [HOUR, MINUTE, DAY] as const;

export type TimeUnitType = (typeof TIME_UNITS)[number];

export const TIME_UNIT_TO_ENUM = {
  [HOUR]: TimeUnit.HOUR,
  [MINUTE]: TimeUnit.MINUTE,
  [DAY]: TimeUnit.DAY,
} as const;

export const ENUM_TO_TIME_UNIT = {
  [TimeUnit.HOUR]: HOUR,
  [TimeUnit.MINUTE]: MINUTE,
  [TimeUnit.DAY]: DAY,
} as const;

export type WorkflowTriggerType = (typeof WORKFLOW_TRIGGER_TYPES)[number];

export class WorkflowTriggerOffsetDto {
  @ApiProperty({ description: "Time value for offset before/after event trigger", example: 24, type: Number })
  @IsNumber()
  value!: number;

  @ApiProperty({ description: "Unit for the offset time", example: HOUR })
  @IsString()
  @IsIn(TIME_UNITS)
  unit!: TimeUnitType;
}

export class BaseWorkflowTriggerDto {
  @ApiProperty({
    description: "Trigger type for the workflow",
  })
  @IsString()
  @IsIn([WORKFLOW_TRIGGER_TYPES])
  type!: WorkflowTriggerType;
}

export class OnCreationTriggerDto {
  @ApiProperty({
    description: "Trigger type for the workflow",
  })
  @IsString()
  @IsIn([NEW_EVENT])
  type: typeof NEW_EVENT = NEW_EVENT;
}

export class OnRescheduleTriggerDto {
  @ApiProperty({
    description: "Trigger type for the workflow",
  })
  @IsString()
  @IsIn([RESCHEDULE_EVENT])
  type: typeof RESCHEDULE_EVENT = RESCHEDULE_EVENT;
}
export class OnCancelTriggerDto {
  @ApiProperty({
    description: "Trigger type for the workflow",
  })
  @IsString()
  @IsIn([EVENT_CANCELLED])
  type: typeof EVENT_CANCELLED = EVENT_CANCELLED;
}

export class OnRejectedTriggerDto {
  @ApiProperty({
    description: "Trigger type for the workflow",
  })
  type: typeof BOOKING_REJECTED = BOOKING_REJECTED;
}

export class OnRequestedTriggerDto {
  @ApiProperty({
    description: "Trigger type for the workflow",
  })
  type: typeof BOOKING_REQUESTED = BOOKING_REQUESTED;
}

export class OnPaymentInitiatedTriggerDto {
  @ApiProperty({
    description: "Trigger type for the workflow",
  })
  type: typeof BOOKING_PAYMENT_INITIATED = BOOKING_PAYMENT_INITIATED;
}

export class OnPaidTriggerDto {
  @ApiProperty({
    description: "Trigger type for the workflow",
  })
  type: typeof BOOKING_PAID = BOOKING_PAID;
}

export class OnNoShowUpdateTriggerDto {
  @ApiProperty({
    description: "Trigger type for the workflow",
  })
  type: typeof BOOKING_NO_SHOW_UPDATED = BOOKING_NO_SHOW_UPDATED;
}

export class TriggerOffsetDTO {
  @ApiProperty({
    description: "Offset before/after the trigger time; required for BEFORE_EVENT and AFTER_EVENT only",
    type: WorkflowTriggerOffsetDto,
  })
  @ValidateNested()
  @Type(() => WorkflowTriggerOffsetDto)
  offset!: WorkflowTriggerOffsetDto;
}

export class OnBeforeEventTriggerDto extends TriggerOffsetDTO {
  @ApiProperty({
    description: "Trigger type for the workflow",
    example: BEFORE_EVENT,
  })
  @IsString()
  @IsIn([BEFORE_EVENT])
  type: typeof BEFORE_EVENT = BEFORE_EVENT;
}

export class OnAfterEventTriggerDto extends TriggerOffsetDTO {
  @ApiProperty({
    description: "Trigger type for the workflow",
    example: AFTER_EVENT,
  })
  @IsString()
  @IsIn([AFTER_EVENT])
  type: typeof AFTER_EVENT = AFTER_EVENT;
}

export class OnAfterCalVideoGuestsNoShowTriggerDto extends TriggerOffsetDTO {
  @ApiProperty({
    description: "Trigger type for the workflow",
    example: AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
  })
  @IsString()
  @IsIn([AFTER_GUESTS_CAL_VIDEO_NO_SHOW])
  type: typeof AFTER_GUESTS_CAL_VIDEO_NO_SHOW = AFTER_GUESTS_CAL_VIDEO_NO_SHOW;
}

export class OnAfterCalVideoHostsNoShowTriggerDto extends TriggerOffsetDTO {
  @ApiProperty({
    description: "Trigger type for the workflow",
    example: AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
  })
  @IsString()
  @IsIn([AFTER_HOSTS_CAL_VIDEO_NO_SHOW])
  type: typeof AFTER_HOSTS_CAL_VIDEO_NO_SHOW = AFTER_HOSTS_CAL_VIDEO_NO_SHOW;
}
