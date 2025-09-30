import { WorkflowFormActivationDto } from "@/modules/workflows/inputs/create-form-workflow";
import { ApiExtraModels, ApiPropertyOptional, getSchemaPath } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsOptional, ValidateNested, ArrayMinSize } from "class-validator";

import {
  BaseFormWorkflowStepDto,
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
  OnFormSubmittedTriggerDto,
  FORM_SUBMITTED,
  FORM_WORKFLOW_TRIGGER_TYPES,
  BaseFormWorkflowTriggerDto,
} from "./workflow-trigger.input";

@ApiExtraModels(
  OnFormSubmittedTriggerDto,
  UpdateEmailAddressWorkflowStepDto,
  UpdateEmailAttendeeWorkflowStepDto,
  UpdateEmailHostWorkflowStepDto,
  UpdatePhoneAttendeeWorkflowStepDto,
  UpdatePhoneWhatsAppNumberWorkflowStepDto,
  UpdateWhatsAppAttendeePhoneWorkflowStepDto,
  UpdatePhoneNumberWorkflowStepDto,
  BaseFormWorkflowTriggerDto
)
export class UpdateFormWorkflowDto {
  @ApiPropertyOptional({ description: "Name of the workflow", example: "Rounting-form Test Workflow" })
  @IsString()
  @IsOptional()
  name?: string;

  @ValidateNested()
  @Type(() => WorkflowFormActivationDto)
  activation!: WorkflowFormActivationDto;

  @ApiPropertyOptional({
    description: `Trigger configuration for the routing-form workflow, allowed triggers are ${FORM_WORKFLOW_TRIGGER_TYPES}`,
    oneOf: [{ $ref: getSchemaPath(OnFormSubmittedTriggerDto) }],
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BaseFormWorkflowTriggerDto, {
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
  @Type(() => BaseFormWorkflowStepDto, {
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
