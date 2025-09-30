import { WorkflowFormActivationDto } from "@/modules/workflows/inputs/create-form-workflow";
import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsString, IsOptional, ValidateNested, ArrayMinSize, IsIn } from "class-validator";

import { WORKFLOW_EVENT_TYPE_ACTIVATION, WORKFLOW_FORM_ACTIVATION } from "./create-workflow.input";
import {
  BaseWorkflowStepDto,
  EMAIL_ADDRESS,
  EMAIL_ATTENDEE,
  FORM_ALLOWED_STEP_ACTIONS,
  UpdateEmailAddressWorkflowStepDto,
  UpdateEmailAttendeeWorkflowStepDto,
  UpdateEmailHostWorkflowStepDto,
  UpdatePhoneAttendeeWorkflowStepDto,
  UpdatePhoneNumberWorkflowStepDto,
  UpdatePhoneWhatsAppNumberWorkflowStepDto,
  UpdateWhatsAppAttendeePhoneWorkflowStepDto,
} from "./workflow-step.input";
import {
  BaseWorkflowTriggerDto,
  OnBeforeEventTriggerDto,
  OnAfterEventTriggerDto,
  OnCancelTriggerDto,
  OnCreationTriggerDto,
  OnRescheduleTriggerDto,
  OnAfterCalVideoGuestsNoShowTriggerDto,
  OnAfterCalVideoHostsNoShowTriggerDto,
  OnFormSubmittedTriggerDto,
  FORM_SUBMITTED,
  OnNoShowUpdateTriggerDto,
  OnRejectedTriggerDto,
  OnRequestedTriggerDto,
  OnPaymentInitiatedTriggerDto,
  OnPaidTriggerDto,
  FORM_WORKFLOW_TRIGGER_TYPES,
} from "./workflow-trigger.input";

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
  UpdateEmailAddressWorkflowStepDto,
  UpdateEmailAttendeeWorkflowStepDto,
  UpdateEmailHostWorkflowStepDto,
  UpdatePhoneAttendeeWorkflowStepDto,
  UpdatePhoneWhatsAppNumberWorkflowStepDto,
  UpdateWhatsAppAttendeePhoneWorkflowStepDto,
  UpdatePhoneNumberWorkflowStepDto,
  BaseWorkflowTriggerDto
)
export class UpdateFormWorkflowDto {
  @ApiPropertyOptional({ description: "Name of the workflow", example: "Rounting-form Test Workflow" })
  @IsString()
  @IsOptional()
  name?: string;

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

  @ValidateNested()
  @Type(() => WorkflowFormActivationDto)
  activation!: WorkflowFormActivationDto;

  @ApiPropertyOptional({
    description: `Trigger configuration for the routing-form workflow, allowed triggers are ${FORM_WORKFLOW_TRIGGER_TYPES}`,
    oneOf: [{ $ref: getSchemaPath(OnFormSubmittedTriggerDto) }],
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BaseWorkflowTriggerDto, {
    keepDiscriminatorProperty: true,
    discriminator: {
      property: "type",
      subTypes: [{ value: OnFormSubmittedTriggerDto, name: FORM_SUBMITTED }],
    },
  })
  trigger?: OnFormSubmittedTriggerDto;

  @ApiPropertyOptional({
    description: `Steps to execute as part of the routing-form workflow, allowed steps are ${FORM_ALLOWED_STEP_ACTIONS.toString()}`,
    oneOf: [
      { $ref: getSchemaPath(UpdateEmailAddressWorkflowStepDto) },
      { $ref: getSchemaPath(UpdateEmailAttendeeWorkflowStepDto) },
    ],
    type: "array",
  })
  @ValidateNested({ each: true })
  @ArrayMinSize(1, {
    message: `Your workflow must contain at least one allowed step. allowed steps are ${FORM_ALLOWED_STEP_ACTIONS.toString()}`,
  })
  @IsOptional()
  @Type(() => BaseWorkflowStepDto, {
    keepDiscriminatorProperty: true,
    discriminator: {
      property: "action",
      subTypes: [
        { value: UpdateEmailAddressWorkflowStepDto, name: EMAIL_ADDRESS },
        { value: UpdateEmailAttendeeWorkflowStepDto, name: EMAIL_ATTENDEE },
      ],
    },
  })
  steps?: (UpdateEmailAddressWorkflowStepDto | UpdateEmailAttendeeWorkflowStepDto)[];
}
