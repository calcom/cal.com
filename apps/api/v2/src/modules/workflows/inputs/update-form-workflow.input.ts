import { WorkflowFormActivationDto } from "@/modules/workflows/inputs/create-form-workflow";
import { ApiExtraModels, ApiPropertyOptional, getSchemaPath } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsOptional, ValidateNested, ArrayMinSize } from "class-validator";

import {
  BaseFormWorkflowStepDto,
  EMAIL_ADDRESS,
  EMAIL_ATTENDEE,
  FORM_ALLOWED_STEP_ACTIONS,
  SMS_ATTENDEE,
  SMS_NUMBER,
  UpdateEmailAddressWorkflowStepDto,
  UpdateEmailAttendeeWorkflowStepDto,
  UpdateEmailHostWorkflowStepDto,
  UpdatePhoneAttendeeWorkflowStepDto,
  UpdatePhoneNumberWorkflowStepDto,
  UpdatePhoneWhatsAppNumberWorkflowStepDto,
  UpdateWhatsAppAttendeePhoneWorkflowStepDto,
} from "./workflow-step.input";
import {
  OnFormSubmittedTriggerDto,
  OnFormSubmittedNoEventTriggerDto,
  FORM_SUBMITTED,
  FORM_SUBMITTED_NO_EVENT,
  FORM_WORKFLOW_TRIGGER_TYPES,
  RoutingFormWorkflowTriggerDto,
} from "./workflow-trigger.input";

@ApiExtraModels(
  OnFormSubmittedTriggerDto,
  OnFormSubmittedNoEventTriggerDto,
  UpdateEmailAddressWorkflowStepDto,
  UpdateEmailAttendeeWorkflowStepDto,
  UpdateEmailHostWorkflowStepDto,
  UpdatePhoneAttendeeWorkflowStepDto,
  UpdatePhoneWhatsAppNumberWorkflowStepDto,
  UpdateWhatsAppAttendeePhoneWorkflowStepDto,
  UpdatePhoneNumberWorkflowStepDto,
  RoutingFormWorkflowTriggerDto,
  WorkflowFormActivationDto
)
export class UpdateFormWorkflowDto {
  @ApiPropertyOptional({ description: "Name of the workflow", example: "Rounting-form Test Workflow" })
  @IsString()
  @IsOptional()
  name?: string;

  @ValidateNested()
  @Type(() => WorkflowFormActivationDto)
  @IsOptional()
  activation?: WorkflowFormActivationDto;

  @ApiPropertyOptional({
    description: `Trigger configuration for the routing-form workflow, allowed triggers are ${FORM_WORKFLOW_TRIGGER_TYPES}`,
    oneOf: [
      { $ref: getSchemaPath(OnFormSubmittedTriggerDto) },
      { $ref: getSchemaPath(OnFormSubmittedNoEventTriggerDto) },
    ],
  })
  @IsOptional()
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
  trigger?: OnFormSubmittedTriggerDto | OnFormSubmittedNoEventTriggerDto;

  @ApiPropertyOptional({
    description: `Steps to execute as part of the routing-form workflow, allowed steps are ${FORM_ALLOWED_STEP_ACTIONS.toString()}`,
    oneOf: [
      { $ref: getSchemaPath(UpdateEmailAddressWorkflowStepDto) },
      { $ref: getSchemaPath(UpdateEmailAttendeeWorkflowStepDto) },
      { $ref: getSchemaPath(UpdatePhoneAttendeeWorkflowStepDto) },
      { $ref: getSchemaPath(UpdatePhoneNumberWorkflowStepDto) },
    ],
    type: "array",
  })
  @ValidateNested({ each: true })
  @ArrayMinSize(1, {
    message: `Your workflow must contain at least one allowed step. allowed steps are ${FORM_ALLOWED_STEP_ACTIONS.toString()}`,
  })
  @IsOptional()
  @Type(() => BaseFormWorkflowStepDto, {
    keepDiscriminatorProperty: true,
    discriminator: {
      property: "action",
      subTypes: [
        { value: UpdateEmailAddressWorkflowStepDto, name: EMAIL_ADDRESS },
        { value: UpdateEmailAttendeeWorkflowStepDto, name: EMAIL_ATTENDEE },
        { value: UpdatePhoneAttendeeWorkflowStepDto, name: SMS_ATTENDEE },
        { value: UpdatePhoneNumberWorkflowStepDto, name: SMS_NUMBER },
      ],
    },
  })
  steps?: (
    | UpdateEmailAddressWorkflowStepDto
    | UpdateEmailAttendeeWorkflowStepDto
    | UpdatePhoneNumberWorkflowStepDto
    | UpdatePhoneAttendeeWorkflowStepDto
  )[];
}
