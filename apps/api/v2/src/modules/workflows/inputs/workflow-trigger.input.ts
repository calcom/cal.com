import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, ValidateNested, IsOptional } from "class-validator";

export const BEFORE_EVENT = "before_event";
export const EVENT_CANCELLED = "event_cancelled";
export const NEW_EVENT = "new_event";
export const AFTER_EVENT = "after_event";
export const RESCHEDULE_EVENT = "reschedule_event";
export const WORKFLOW_TRIGGER_TYPES = [
  BEFORE_EVENT,
  EVENT_CANCELLED,
  NEW_EVENT,
  AFTER_EVENT,
  RESCHEDULE_EVENT,
] as const;

export const HOUR = "hour";
export const MINUTE = "minute";
export const DAY = "day";

export const TIME_UNITS = [HOUR, MINUTE, DAY] as const;

export type TimeUnitType = (typeof TIME_UNITS)[number];

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
    required: true,
  })
  @ValidateNested()
  @Type(() => WorkflowTriggerOffsetDto)
  @IsOptional()
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
