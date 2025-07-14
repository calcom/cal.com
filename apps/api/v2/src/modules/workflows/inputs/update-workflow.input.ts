import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsString, IsOptional, ValidateNested, ArrayMinSize } from "class-validator";

import { WorkflowActivationDto } from "./create-workflow.input";
import {
  WorkflowEmailAttendeeStepDto,
  WorkflowEmailAddressStepDto,
  WorkflowEmailHostStepDto,
  WorkflowPhoneWhatsAppNumberStepDto,
  WorkflowPhoneAttendeeStepDto,
  WorkflowPhoneNumberStepDto,
  WorkflowPhoneWhatsAppAttendeeStepDto,
  BaseWorkflowStepDto,
  EMAIL_ADDRESS,
  EMAIL_ATTENDEE,
  EMAIL_HOST,
  WHATSAPP_ATTENDEE,
  WHATSAPP_NUMBER,
  SMS_NUMBER,
  SMS_ATTENDEE,
} from "./workflow-step.input";
import {
  BaseWorkflowTriggerDto,
  OnBeforeEventTriggerDto,
  BEFORE_EVENT,
  OnAfterEventTriggerDto,
  AFTER_EVENT,
  OnCancelTriggerDto,
  EVENT_CANCELLED,
  OnCreationTriggerDto,
  NEW_EVENT,
  OnRescheduleTriggerDto,
  RESCHEDULE_EVENT,
  OnAfterCalVideoGuestsNoShowTriggerDto,
  AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
  OnAfterCalVideoHostsNoShowTriggerDto,
  AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
} from "./workflow-trigger.input";

export type UpdateWorkflowStepDto =
  | UpdateEmailAttendeeWorkflowStepDto
  | UpdateEmailAddressWorkflowStepDto
  | UpdateEmailHostWorkflowStepDto
  | UpdateWhatsAppAttendeePhoneWorkflowStepDto
  | UpdatePhoneWhatsAppNumberWorkflowStepDto
  | UpdatePhoneAttendeeWorkflowStepDto
  | UpdatePhoneNumberWorkflowStepDto;
export class UpdateEmailAttendeeWorkflowStepDto extends WorkflowEmailAttendeeStepDto {
  @ApiProperty({
    description:
      "Unique identifier of the step you want to update, if adding a new step do not provide this id",
    example: 67244,
  })
  @IsNumber()
  id?: number;
}

export class UpdateEmailAddressWorkflowStepDto extends WorkflowEmailAddressStepDto {
  @ApiProperty({
    description:
      "Unique identifier of the step you want to update, if adding a new step do not provide this id",
    example: 67244,
  })
  @IsNumber()
  id?: number;
}

export class UpdateEmailHostWorkflowStepDto extends WorkflowEmailHostStepDto {
  @ApiProperty({
    description:
      "Unique identifier of the step you want to update, if adding a new step do not provide this id",
    example: 67244,
  })
  @IsNumber()
  id?: number;
}

export class UpdatePhoneWhatsAppNumberWorkflowStepDto extends WorkflowPhoneWhatsAppNumberStepDto {
  @ApiProperty({
    description:
      "Unique identifier of the step you want to update, if adding a new step do not provide this id",
    example: 67244,
  })
  @IsNumber()
  id?: number;
}
export class UpdatePhoneAttendeeWorkflowStepDto extends WorkflowPhoneAttendeeStepDto {
  @ApiProperty({
    description:
      "Unique identifier of the step you want to update, if adding a new step do not provide this id",
    example: 67244,
  })
  @IsNumber()
  id?: number;
}
export class UpdatePhoneNumberWorkflowStepDto extends WorkflowPhoneNumberStepDto {
  @ApiProperty({
    description:
      "Unique identifier of the step you want to update, if adding a new step do not provide this id",
    example: 67244,
  })
  @IsNumber()
  id?: number;
}
export class UpdateWhatsAppAttendeePhoneWorkflowStepDto extends WorkflowPhoneWhatsAppAttendeeStepDto {
  @ApiProperty({
    description:
      "Unique identifier of the step you want to update, if adding a new step do not provide this id",
    example: 67244,
  })
  @IsNumber()
  id?: number;
}

@ApiExtraModels(
  OnBeforeEventTriggerDto,
  OnAfterEventTriggerDto,
  OnCancelTriggerDto,
  OnCreationTriggerDto,
  OnRescheduleTriggerDto,
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
export class UpdateWorkflowDto {
  @ApiPropertyOptional({ description: "Name of the workflow", example: "Platform Test Workflow" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: "Activation settings for the workflow, the action that will trigger the workflow.",
    type: WorkflowActivationDto,
  })
  @ValidateNested()
  @Type(() => WorkflowActivationDto)
  @IsOptional()
  activation?: WorkflowActivationDto;

  @ApiPropertyOptional({
    description: "Trigger configuration for the workflow",
    oneOf: [
      { $ref: getSchemaPath(OnBeforeEventTriggerDto) },
      { $ref: getSchemaPath(OnAfterEventTriggerDto) },
      { $ref: getSchemaPath(OnCancelTriggerDto) },
      { $ref: getSchemaPath(OnCreationTriggerDto) },
      { $ref: getSchemaPath(OnRescheduleTriggerDto) },
      { $ref: getSchemaPath(OnAfterCalVideoGuestsNoShowTriggerDto) },
      { $ref: getSchemaPath(OnAfterCalVideoHostsNoShowTriggerDto) },
    ],
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BaseWorkflowTriggerDto, {
    discriminator: {
      property: "type",
      subTypes: [
        { value: OnBeforeEventTriggerDto, name: BEFORE_EVENT },
        { value: OnAfterEventTriggerDto, name: AFTER_EVENT },
        { value: OnCancelTriggerDto, name: EVENT_CANCELLED },
        { value: OnCreationTriggerDto, name: NEW_EVENT },
        { value: OnRescheduleTriggerDto, name: RESCHEDULE_EVENT },
        { value: OnAfterCalVideoGuestsNoShowTriggerDto, name: AFTER_GUESTS_CAL_VIDEO_NO_SHOW },
        { value: OnAfterCalVideoHostsNoShowTriggerDto, name: AFTER_HOSTS_CAL_VIDEO_NO_SHOW },
      ],
    },
  })
  trigger?:
    | OnAfterEventTriggerDto
    | OnBeforeEventTriggerDto
    | OnCreationTriggerDto
    | OnRescheduleTriggerDto
    | OnCancelTriggerDto
    | OnAfterCalVideoGuestsNoShowTriggerDto
    | OnAfterCalVideoHostsNoShowTriggerDto;

  @ApiPropertyOptional({
    description: "Steps to execute as part of the workflow",
    oneOf: [
      { $ref: getSchemaPath(UpdateEmailAddressWorkflowStepDto) },
      { $ref: getSchemaPath(UpdateEmailAttendeeWorkflowStepDto) },
      { $ref: getSchemaPath(UpdateEmailHostWorkflowStepDto) },
      { $ref: getSchemaPath(UpdatePhoneAttendeeWorkflowStepDto) },
      { $ref: getSchemaPath(UpdatePhoneWhatsAppNumberWorkflowStepDto) },
      { $ref: getSchemaPath(UpdateWhatsAppAttendeePhoneWorkflowStepDto) },
      { $ref: getSchemaPath(UpdatePhoneNumberWorkflowStepDto) },
    ],
    type: "array",
  })
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: "Your workflow must contain at least one step." })
  @IsOptional()
  @Type(() => BaseWorkflowStepDto, {
    discriminator: {
      property: "action",
      subTypes: [
        { value: UpdateEmailAddressWorkflowStepDto, name: EMAIL_ADDRESS },
        { value: UpdateEmailAttendeeWorkflowStepDto, name: EMAIL_ATTENDEE },
        { value: UpdateEmailHostWorkflowStepDto, name: EMAIL_HOST },
        { value: UpdateWhatsAppAttendeePhoneWorkflowStepDto, name: WHATSAPP_ATTENDEE },
        { value: UpdatePhoneWhatsAppNumberWorkflowStepDto, name: WHATSAPP_NUMBER },
        { value: UpdatePhoneNumberWorkflowStepDto, name: SMS_NUMBER },
        { value: UpdatePhoneAttendeeWorkflowStepDto, name: SMS_ATTENDEE },
      ],
    },
  })
  steps?: (
    | UpdateEmailAddressWorkflowStepDto
    | UpdateEmailAttendeeWorkflowStepDto
    | UpdateEmailHostWorkflowStepDto
    | UpdatePhoneAttendeeWorkflowStepDto
    | UpdatePhoneWhatsAppNumberWorkflowStepDto
    | UpdateWhatsAppAttendeePhoneWorkflowStepDto
    | UpdatePhoneNumberWorkflowStepDto
  )[];
}
