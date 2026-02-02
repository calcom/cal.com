import {
  BaseWorkflowOutput,
  BaseWorkflowStepOutputDto,
  WorkflowTriggerOffsetOutputDto,
} from "@/modules/workflows/outputs/base-workflow.output";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsArray, IsEnum, IsIn, IsString, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

import { EMAIL_HOST, FORM_ALLOWED_STEP_ACTIONS, FormAllowedStepAction } from "../inputs/workflow-step.input";
import {
  FORM_SUBMITTED,
  FORM_WORKFLOW_TRIGGER_TYPES,
  WorkflowFormTriggerType,
} from "../inputs/workflow-trigger.input";

export const WORKFLOW_TYPE_FORM = "routing-form";
export const WORKFLOW_TYPE_EVENT_TYPE = "event-type";

export class RoutingFormWorkflowStepOutputDto extends BaseWorkflowStepOutputDto {
  @ApiProperty({ description: "Action to perform", example: EMAIL_HOST, enum: FORM_ALLOWED_STEP_ACTIONS })
  @Expose()
  action!: FormAllowedStepAction;
}

export class RoutingFormWorkflowTriggerOutputDto {
  @ApiProperty({
    description: "Trigger type for the workflow",
    example: FORM_SUBMITTED,
    enum: FORM_WORKFLOW_TRIGGER_TYPES,
  })
  @Expose()
  type!: WorkflowFormTriggerType;

  @ApiPropertyOptional({
    description: "Offset details (present for BEFORE_EVENT/AFTER_EVENT/FORM_SUBMITTED_NO_EVENT)",
    type: WorkflowTriggerOffsetOutputDto,
  })
  @Expose()
  @ValidateNested()
  @Type(() => WorkflowTriggerOffsetOutputDto)
  offset?: WorkflowTriggerOffsetOutputDto;
}

export class RoutingFormWorkflowActivationOutputDto {
  @ApiProperty({
    description: "Whether the workflow is active for all routing forms associated with the team/user",
    example: false,
  })
  @Expose()
  isActiveOnAllRoutingForms?: boolean = false;

  @ApiPropertyOptional({
    description: "List of Event Type IDs the workflow is specifically active on (if not active on all)",
    example: ["5cacdec7-1234-6e1b-78d9-7bcda8a1b332"],
  })
  @Expose()
  @IsArray()
  activeOnRoutingFormIds?: string[];
}

// --- Main Workflow Output DTO ---

export class RoutingFormWorkflowOutput extends BaseWorkflowOutput {
  @ApiProperty({
    description: "type of the workflow",
    example: WORKFLOW_TYPE_FORM,
    default: WORKFLOW_TYPE_FORM,
  })
  @IsString()
  @IsIn([WORKFLOW_TYPE_FORM])
  type!: typeof WORKFLOW_TYPE_FORM;

  @ApiProperty({
    description: "Activation settings for the workflow",
  })
  @Expose()
  @Type(() => RoutingFormWorkflowActivationOutputDto)
  @ValidateNested()
  activation!: RoutingFormWorkflowActivationOutputDto;

  @ApiProperty({ description: "Trigger configuration", type: RoutingFormWorkflowTriggerOutputDto })
  @Expose()
  @ValidateNested()
  @Type(() => RoutingFormWorkflowTriggerOutputDto)
  trigger!: RoutingFormWorkflowTriggerOutputDto;

  @ApiProperty({ description: "Steps comprising the workflow", type: [RoutingFormWorkflowStepOutputDto] })
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutingFormWorkflowStepOutputDto)
  steps!: RoutingFormWorkflowStepOutputDto[];
}

export class GetRoutingFormWorkflowsOutput {
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
    type: [RoutingFormWorkflowOutput],
  })
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutingFormWorkflowOutput)
  data!: RoutingFormWorkflowOutput[];
}

export class GetRoutingFormWorkflowOutput {
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
    type: [RoutingFormWorkflowOutput],
  })
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutingFormWorkflowOutput)
  data!: RoutingFormWorkflowOutput;
}
