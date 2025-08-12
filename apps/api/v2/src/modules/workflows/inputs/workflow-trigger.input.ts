import { ApiProperty } from "@nestjs/swagger";
import { TimeUnit, WorkflowTriggerEvents } from "@prisma/client";
import { Type } from "class-transformer";
import { IsNumber, ValidateNested } from "class-validator";

export const BEFORE_EVENT = "beforeEvent";
export const EVENT_CANCELLED = "eventCancelled";
export const NEW_EVENT = "newEvent";
export const AFTER_EVENT = "afterEvent";
export const RESCHEDULE_EVENT = "rescheduleEvent";
export const AFTER_HOSTS_CAL_VIDEO_NO_SHOW = "afterHostsCalVideoNoShow";
export const AFTER_GUESTS_CAL_VIDEO_NO_SHOW = "afterGuestsCalVideoNoShow";
export const WORKFLOW_TRIGGER_TYPES = [
  BEFORE_EVENT,
  EVENT_CANCELLED,
  NEW_EVENT,
  AFTER_EVENT,
  RESCHEDULE_EVENT,
  AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
  AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
] as const;

export const WORKFLOW_TRIGGER_TO_ENUM = {
  [BEFORE_EVENT]: WorkflowTriggerEvents.BEFORE_EVENT,
  [EVENT_CANCELLED]: WorkflowTriggerEvents.EVENT_CANCELLED,
  [NEW_EVENT]: WorkflowTriggerEvents.NEW_EVENT,
  [AFTER_EVENT]: WorkflowTriggerEvents.AFTER_EVENT,
  [RESCHEDULE_EVENT]: WorkflowTriggerEvents.RESCHEDULE_EVENT,
  [AFTER_HOSTS_CAL_VIDEO_NO_SHOW]: WorkflowTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
  [AFTER_GUESTS_CAL_VIDEO_NO_SHOW]: WorkflowTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
} as const;

export const ENUM_TO_WORKFLOW_TRIGGER = {
  [WorkflowTriggerEvents.BEFORE_EVENT]: BEFORE_EVENT,
  [WorkflowTriggerEvents.EVENT_CANCELLED]: EVENT_CANCELLED,
  [WorkflowTriggerEvents.NEW_EVENT]: NEW_EVENT,
  [WorkflowTriggerEvents.AFTER_EVENT]: AFTER_EVENT,
  [WorkflowTriggerEvents.RESCHEDULE_EVENT]: RESCHEDULE_EVENT,
  [WorkflowTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW]: AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
  [WorkflowTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW]: AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
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
  unit!: TimeUnitType;
}

export class BaseWorkflowTriggerDto {
  @ApiProperty({
    description: "Trigger type for the workflow",
  })
  type!: WorkflowTriggerType;
}

export class OnCreationTriggerDto {
  @ApiProperty({
    description: "Trigger type for the workflow",
  })
  type: typeof NEW_EVENT = NEW_EVENT;
}

export class OnRescheduleTriggerDto {
  @ApiProperty({
    description: "Trigger type for the workflow",
  })
  type: typeof RESCHEDULE_EVENT = RESCHEDULE_EVENT;
}
export class OnCancelTriggerDto {
  @ApiProperty({
    description: "Trigger type for the workflow",
  })
  type: typeof EVENT_CANCELLED = EVENT_CANCELLED;
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
  type: typeof BEFORE_EVENT = BEFORE_EVENT;
}

export class OnAfterEventTriggerDto extends TriggerOffsetDTO {
  @ApiProperty({
    description: "Trigger type for the workflow",
    example: AFTER_EVENT,
  })
  type: typeof AFTER_EVENT = AFTER_EVENT;
}

export class OnAfterCalVideoGuestsNoShowTriggerDto extends TriggerOffsetDTO {
  @ApiProperty({
    description: "Trigger type for the workflow",
    example: AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
  })
  type: typeof AFTER_GUESTS_CAL_VIDEO_NO_SHOW = AFTER_GUESTS_CAL_VIDEO_NO_SHOW;
}

export class OnAfterCalVideoHostsNoShowTriggerDto extends TriggerOffsetDTO {
  @ApiProperty({
    description: "Trigger type for the workflow",
    example: AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
  })
  type: typeof AFTER_HOSTS_CAL_VIDEO_NO_SHOW = AFTER_HOSTS_CAL_VIDEO_NO_SHOW;
}
