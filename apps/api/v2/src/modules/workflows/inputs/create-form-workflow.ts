import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  ArrayMinSize,
  IsOptional,
  IsString,
  ValidateNested,
  ValidateIf,
  IsIn,
} from "class-validator";

import {
  BaseWorkflowStepDto,
  EMAIL_ADDRESS,
  EMAIL_ATTENDEE,
  FORM_ALLOWED_STEP_ACTIONS,
  WorkflowEmailAddressStepDto,
  WorkflowEmailAttendeeStepDto,
  WorkflowEmailHostStepDto,
  WorkflowPhoneAttendeeStepDto,
  WorkflowPhoneNumberStepDto,
  WorkflowPhoneWhatsAppAttendeeStepDto,
  WorkflowPhoneWhatsAppNumberStepDto,
} from "./workflow-step.input";
import {
  BaseWorkflowTriggerDto,
  FORM_SUBMITTED,
  FORM_WORKFLOW_TRIGGER_TYPES,
  OnAfterCalVideoGuestsNoShowTriggerDto,
  OnAfterCalVideoHostsNoShowTriggerDto,
  OnAfterEventTriggerDto,
  OnBeforeEventTriggerDto,
  OnCancelTriggerDto,
  OnCreationTriggerDto,
  OnFormSubmittedTriggerDto,
  OnNoShowUpdateTriggerDto,
  OnPaidTriggerDto,
  OnPaymentInitiatedTriggerDto,
  OnRejectedTriggerDto,
  OnRequestedTriggerDto,
  OnRescheduleTriggerDto,
} from "./workflow-trigger.input";

export const WORKFLOW_FORM_ACTIVATION = "form";
export const WORKFLOW_EVENT_TYPE_ACTIVATION = "event-type";
export const WORKFLOW_ACTIVATION_TYPES = [WORKFLOW_FORM_ACTIVATION, WORKFLOW_EVENT_TYPE_ACTIVATION] as const;

export type WorkflowActivationType = (typeof WORKFLOW_ACTIVATION_TYPES)[number];

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

export type TriggerDtoType =
  | OnAfterEventTriggerDto
  | OnBeforeEventTriggerDto
  | OnCreationTriggerDto
  | OnRescheduleTriggerDto
  | OnCancelTriggerDto
  | OnAfterCalVideoGuestsNoShowTriggerDto
  | OnFormSubmittedTriggerDto
  | OnRejectedTriggerDto
  | OnRequestedTriggerDto
  | OnPaymentInitiatedTriggerDto
  | OnPaidTriggerDto
  | OnNoShowUpdateTriggerDto
  | OnAfterCalVideoHostsNoShowTriggerDto;

@ApiExtraModels(
  OnBeforeEventTriggerDto,
  OnAfterEventTriggerDto,
  OnFormSubmittedTriggerDto,
  OnCancelTriggerDto,
  OnCreationTriggerDto,
  OnRescheduleTriggerDto,
  OnNoShowUpdateTriggerDto,
  OnRejectedTriggerDto,
  OnRequestedTriggerDto,
  OnPaymentInitiatedTriggerDto,
  OnPaidTriggerDto,
  OnAfterCalVideoGuestsNoShowTriggerDto,
  OnAfterCalVideoHostsNoShowTriggerDto,
  WorkflowEmailAddressStepDto,
  WorkflowEmailAttendeeStepDto,
  WorkflowEmailHostStepDto,
  WorkflowPhoneWhatsAppAttendeeStepDto,
  WorkflowPhoneWhatsAppNumberStepDto,
  WorkflowPhoneNumberStepDto,
  WorkflowPhoneAttendeeStepDto,
  BaseWorkflowTriggerDto
)
export class CreateFormWorkflowDto {
  @ApiProperty({ description: "Name of the workflow", example: "Platform Test Workflow" })
  @IsString()
  name!: string;

  @ApiProperty({
    description: "type of the workflow",
    example: WORKFLOW_FORM_ACTIVATION,
    default: WORKFLOW_FORM_ACTIVATION,
  })
  @IsString()
  @IsIn([WORKFLOW_FORM_ACTIVATION, WORKFLOW_EVENT_TYPE_ACTIVATION])
  @IsOptional()
  @Transform(
    ({ value }: { value?: typeof WORKFLOW_EVENT_TYPE_ACTIVATION | typeof WORKFLOW_FORM_ACTIVATION }) =>
      value ?? WORKFLOW_EVENT_TYPE_ACTIVATION
  )
  type: typeof WORKFLOW_FORM_ACTIVATION = WORKFLOW_FORM_ACTIVATION;

  @ApiProperty({
    description: "Activation settings for the workflow",
    type: WorkflowFormActivationDto,
  })
  @ValidateNested()
  @Type(() => WorkflowFormActivationDto)
  activation!: WorkflowFormActivationDto;

  @ApiProperty({
    description: `Trigger configuration for the routing-form workflow, allowed triggers are ${FORM_WORKFLOW_TRIGGER_TYPES.toString()}`,
    oneOf: [{ $ref: getSchemaPath(OnFormSubmittedTriggerDto) }],
  })
  @ValidateNested()
  @Type(() => BaseWorkflowTriggerDto, {
    keepDiscriminatorProperty: true,
    discriminator: {
      property: "type",
      subTypes: [{ value: OnFormSubmittedTriggerDto, name: FORM_SUBMITTED }],
    },
  })
  trigger!: OnFormSubmittedTriggerDto;

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
  @Type(() => BaseWorkflowStepDto, {
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
