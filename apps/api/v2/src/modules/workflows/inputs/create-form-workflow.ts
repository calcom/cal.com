import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, ArrayMinSize, IsOptional, IsString, ValidateNested, ValidateIf } from "class-validator";

import {
  BaseFormWorkflowStepDto,
  EMAIL_ADDRESS,
  EMAIL_ATTENDEE,
  FORM_ALLOWED_STEP_ACTIONS,
  WorkflowEmailAddressStepDto,
  WorkflowEmailAttendeeStepDto,
} from "./workflow-step.input";
import {
  RoutingFormWorkflowTriggerDto,
  FORM_SUBMITTED,
  FORM_SUBMITTED_NO_EVENT,
  FORM_WORKFLOW_TRIGGER_TYPES,
  OnFormSubmittedNoEventTriggerDto,
  OnFormSubmittedTriggerDto,
} from "./workflow-trigger.input";

export class WorkflowFormActivationDto {
  @ApiProperty({
    description: "Whether the workflow is active for all the routing forms",
    example: false,
    type: Boolean,
  })
  @IsBoolean()
  isActiveOnAllRoutingForms = false;

  @ApiPropertyOptional({
    description: "List of routing form IDs the workflow applies to",
    example: ["abd1-123edf-a213d-123dfwf"],
    type: [Number],
  })
  @ValidateIf((o) => !o.isActiveOnAllEventTypes)
  @IsOptional()
  @IsString({ each: true })
  activeOnRoutingFormIds: string[] = [];
}

@ApiExtraModels(
  OnFormSubmittedTriggerDto,
  OnFormSubmittedNoEventTriggerDto,
  WorkflowEmailAddressStepDto,
  WorkflowEmailAttendeeStepDto,
  RoutingFormWorkflowTriggerDto,
  WorkflowFormActivationDto
)
export class CreateFormWorkflowDto {
  @ApiProperty({ description: "Name of the workflow", example: "Platform Test Workflow" })
  @IsString()
  name!: string;

  @ApiProperty({
    description: "Activation settings for the workflow",
    type: WorkflowFormActivationDto,
  })
  @ValidateNested()
  @Type(() => WorkflowFormActivationDto)
  activation!: WorkflowFormActivationDto;

  @ApiProperty({
    description: `Trigger configuration for the routing-form workflow, allowed triggers are ${FORM_WORKFLOW_TRIGGER_TYPES.toString()}`,
    oneOf: [
      { $ref: getSchemaPath(OnFormSubmittedTriggerDto) },
      { $ref: getSchemaPath(OnFormSubmittedNoEventTriggerDto) },
    ],
  })
  @ValidateNested()
  @Type(() => RoutingFormWorkflowTriggerDto, {
    keepDiscriminatorProperty: true,
    discriminator: {
      property: "type",
      subTypes: [
        { value: OnFormSubmittedTriggerDto, name: FORM_SUBMITTED },
        { value: OnFormSubmittedNoEventTriggerDto, name: FORM_SUBMITTED_NO_EVENT },
      ],
    },
  })
  trigger!: OnFormSubmittedTriggerDto | OnFormSubmittedNoEventTriggerDto;

  @ApiProperty({
    description: `Steps to execute as part of the routing-form workflow, allowed steps are ${FORM_ALLOWED_STEP_ACTIONS.toString()}`,
    oneOf: [
      { $ref: getSchemaPath(WorkflowEmailAddressStepDto) },
      { $ref: getSchemaPath(WorkflowEmailAttendeeStepDto) },
    ],
    type: "array",
  })
  @ValidateNested({ each: true })
  @ArrayMinSize(1, {
    message: `Your workflow must contain at least one allowed step. allowed steps are ${FORM_ALLOWED_STEP_ACTIONS.toString()}`,
  })
  @Type(() => BaseFormWorkflowStepDto, {
    keepDiscriminatorProperty: true,
    discriminator: {
      property: "action",
      subTypes: [
        { value: WorkflowEmailAddressStepDto, name: EMAIL_ADDRESS },
        { value: WorkflowEmailAttendeeStepDto, name: EMAIL_ATTENDEE },
      ],
    },
  })
  steps!: (WorkflowEmailAddressStepDto | WorkflowEmailAttendeeStepDto)[];
}
