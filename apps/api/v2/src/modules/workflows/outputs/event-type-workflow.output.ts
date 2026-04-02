import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsArray, IsEnum, IsIn, IsString, ValidateNested } from "class-validator";
import { EMAIL_HOST, STEP_ACTIONS, StepAction } from "../inputs/workflow-step.input";
import {
  BEFORE_EVENT,
  EVENT_TYPE_WORKFLOW_TRIGGER_TYPES,
  WorkflowEventTypeTriggerType,
} from "../inputs/workflow-trigger.input";
import {
  BaseWorkflowOutput,
  BaseWorkflowStepOutputDto,
  WorkflowTriggerOffsetOutputDto,
} from "@/modules/workflows/outputs/base-workflow.output";

export const WORKFLOW_TYPE_FORM = "routing-form";
export const WORKFLOW_TYPE_EVENT_TYPE = "event-type";

export class EventTypeWorkflowStepOutputDto extends BaseWorkflowStepOutputDto {
  @ApiProperty({ description: "Action to perform", example: EMAIL_HOST, enum: STEP_ACTIONS })
  @Expose()
  action!: StepAction;
}

export class EventTypeWorkflowTriggerOutputDto {
  @ApiProperty({
    description: "Trigger type for the workflow",
    example: BEFORE_EVENT,
    enum: EVENT_TYPE_WORKFLOW_TRIGGER_TYPES,
  })
  @Expose()
  type!: WorkflowEventTypeTriggerType;

  @ApiPropertyOptional({
    description: "Offset details (present for BEFORE_EVENT/AFTER_EVENT)",
    type: WorkflowTriggerOffsetOutputDto,
  })
  @Expose()
  @ValidateNested()
  @Type(() => WorkflowTriggerOffsetOutputDto)
  offset?: WorkflowTriggerOffsetOutputDto;
}

export class EventTypeWorkflowActivationOutputDto {
  @ApiProperty({
    description: "Whether the workflow is active for all event types associated with the team/user",
    example: false,
  })
  @Expose()
  isActiveOnAllEventTypes?: boolean = false;

  @ApiPropertyOptional({
    description: "List of Event Type IDs the workflow is specifically active on (if not active on all)",
    example: [698191, 698192],
  })
  @Expose()
  @IsArray()
  activeOnEventTypeIds?: number[];
}

// --- Main Workflow Output DTO ---

export class EventTypeWorkflowOutput extends BaseWorkflowOutput {
  @ApiProperty({
    description: "type of the workflow",
    example: WORKFLOW_TYPE_EVENT_TYPE,
    default: WORKFLOW_TYPE_EVENT_TYPE,
  })
  @IsString()
  @IsIn([WORKFLOW_TYPE_EVENT_TYPE])
  type!: typeof WORKFLOW_TYPE_EVENT_TYPE;

  @ApiProperty({
    description: "Activation settings for the workflow",
  })
  @Expose()
  @ValidateNested()
  @Type(() => EventTypeWorkflowActivationOutputDto)
  activation!: EventTypeWorkflowActivationOutputDto;

  @ApiProperty({ description: "Trigger configuration", type: EventTypeWorkflowTriggerOutputDto })
  @Expose()
  @ValidateNested()
  @Type(() => EventTypeWorkflowTriggerOutputDto)
  trigger!: EventTypeWorkflowTriggerOutputDto;

  @ApiProperty({ description: "Steps comprising the workflow", type: [EventTypeWorkflowStepOutputDto] })
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventTypeWorkflowStepOutputDto)
  steps!: EventTypeWorkflowStepOutputDto[];
}

// --- List Response Output DTO ---

export class GetEventTypeWorkflowsOutput {
  @ApiProperty({
    description: "Indicates the status of the response",
    example: SUCCESS_STATUS,
    enum: [SUCCESS_STATUS, ERROR_STATUS],
  })
  @Expose()
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    description: "List of workflows",
    type: [EventTypeWorkflowOutput],
  })
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventTypeWorkflowOutput)
  data!: EventTypeWorkflowOutput[];
}

export class GetEventTypeWorkflowOutput {
  @ApiProperty({
    description: "Indicates the status of the response",
    example: SUCCESS_STATUS,
    enum: [SUCCESS_STATUS, ERROR_STATUS],
  })
  @Expose()
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    description: "workflow",
    type: [EventTypeWorkflowOutput],
  })
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventTypeWorkflowOutput)
  data!: EventTypeWorkflowOutput;
}
