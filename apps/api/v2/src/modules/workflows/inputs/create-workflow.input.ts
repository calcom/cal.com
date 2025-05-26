import { ApiProperty, ApiPropertyOptional, getSchemaPath } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  ArrayMinSize,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  ValidateIf,
} from "class-validator";

import {
  BaseWorkflowStepDto,
  EMAIL_ADDRESS,
  EMAIL_ATTENDEE,
  EMAIL_HOST,
  SMS_ATTENDEE,
  SMS_NUMBER,
  WHATSAPP_ATTENDEE,
  WHATSAPP_NUMBER,
  WorkflowEmailAddressStepDto,
  WorkflowEmailAttendeeStepDto,
  WorkflowEmailHostStepDto,
  WorkflowPhoneAttendeeStepDto,
  WorkflowPhoneNumberStepDto,
  WorkflowPhoneWhatsAppAttendeeStepDto,
  WorkflowPhoneWhatsAppNumberStepDto,
} from "./workflow-step.input";
import {
  AFTER_EVENT,
  BaseWorkflowTriggerDto,
  BEFORE_EVENT,
  EVENT_CANCELLED,
  NEW_EVENT,
  OnAfterEventTriggerDto,
  OnBeforeEventTriggerDto,
  OnCancelTriggerDto,
  OnCreationTriggerDto,
  OnRescheduleTriggerDto,
  RESCHEDULE_EVENT,
} from "./workflow-trigger.input";

export class WorkflowActivationDto {
  @ApiProperty({
    description: "Whether the workflow is active for all the event-types",
    example: false,
    type: Boolean,
  })
  @IsBoolean()
  isActiveOnAllEventTypes = false;

  @ApiPropertyOptional({
    description: "List of active calendar IDs the workflow applies to, required if isActiveOnAll is false",
    example: [698191],
    type: [Number],
  })
  @ValidateIf((o) => !Boolean(o.isActiveOnAllEventTypes))
  @IsOptional()
  @IsNumber({}, { each: true })
  activeOnEventTypeIds: number[] = [];
}

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

export type TriggerDtoType =
  | OnAfterEventTriggerDto
  | OnBeforeEventTriggerDto
  | OnCreationTriggerDto
  | OnRescheduleTriggerDto
  | OnCancelTriggerDto;
export class CreateWorkflowDto {
  @ApiProperty({ description: "Name of the workflow", example: "Platform Test Workflow" })
  @IsString()
  name!: string;

  @ApiProperty({ description: "Activation settings for the workflow", type: WorkflowActivationDto })
  @ValidateNested()
  @Type(() => WorkflowActivationDto)
  activation!: WorkflowActivationDto;

  @ApiProperty({ description: "Trigger configuration for the workflow", type: BaseWorkflowTriggerDto })
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
      ],
    },
  })
  trigger!:
    | OnAfterEventTriggerDto
    | OnBeforeEventTriggerDto
    | OnCreationTriggerDto
    | OnRescheduleTriggerDto
    | OnCancelTriggerDto;

  @ApiProperty({
    description: "Steps to execute as part of the workflow",
    items: {
      oneOf: [
        { $ref: getSchemaPath(WorkflowEmailAddressStepDto) },
        { $ref: getSchemaPath(WorkflowEmailAttendeeStepDto) },
        { $ref: getSchemaPath(WorkflowEmailHostStepDto) },
        { $ref: getSchemaPath(WorkflowPhoneWhatsAppAttendeeStepDto) },
        { $ref: getSchemaPath(WorkflowPhoneWhatsAppNumberStepDto) },
        { $ref: getSchemaPath(WorkflowPhoneNumberStepDto) },
        { $ref: getSchemaPath(WorkflowPhoneAttendeeStepDto) },
      ],
    },
  })
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: "Your workflow must contain at least one step." })
  @Type(() => BaseWorkflowStepDto, {
    discriminator: {
      property: "action",
      subTypes: [
        { value: WorkflowEmailAddressStepDto, name: EMAIL_ADDRESS },
        { value: WorkflowEmailAttendeeStepDto, name: EMAIL_ATTENDEE },
        { value: WorkflowEmailHostStepDto, name: EMAIL_HOST },
        { value: WorkflowPhoneWhatsAppAttendeeStepDto, name: WHATSAPP_ATTENDEE },
        { value: WorkflowPhoneWhatsAppNumberStepDto, name: WHATSAPP_NUMBER },
        { value: WorkflowPhoneNumberStepDto, name: SMS_NUMBER },
        { value: WorkflowPhoneAttendeeStepDto, name: SMS_ATTENDEE },
      ],
    },
  })
  steps!: (
    | WorkflowEmailAddressStepDto
    | WorkflowEmailAttendeeStepDto
    | WorkflowEmailHostStepDto
    | WorkflowPhoneWhatsAppAttendeeStepDto
    | WorkflowPhoneWhatsAppNumberStepDto
    | WorkflowPhoneNumberStepDto
    | WorkflowPhoneAttendeeStepDto
  )[];
}

export class UpdateWorkflowDto {
  @ApiProperty({ description: "Name of the workflow", example: "Platform Test Workflow" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: "Activation settings for the workflow", type: WorkflowActivationDto })
  @ValidateNested()
  @Type(() => WorkflowActivationDto)
  @IsOptional()
  activation?: WorkflowActivationDto;

  @Type(() => BaseWorkflowTriggerDto, {
    discriminator: {
      property: "type",
      subTypes: [
        { value: OnBeforeEventTriggerDto, name: BEFORE_EVENT },
        { value: OnAfterEventTriggerDto, name: AFTER_EVENT },
        { value: OnCancelTriggerDto, name: EVENT_CANCELLED },
        { value: OnCreationTriggerDto, name: NEW_EVENT },
        { value: OnRescheduleTriggerDto, name: RESCHEDULE_EVENT },
      ],
    },
  })
  trigger!:
    | OnAfterEventTriggerDto
    | OnBeforeEventTriggerDto
    | OnCreationTriggerDto
    | OnRescheduleTriggerDto
    | OnCancelTriggerDto;

  @ApiProperty({
    description: "Steps to execute as part of the workflow",
    items: {
      oneOf: [
        { $ref: getSchemaPath(UpdateEmailAddressWorkflowStepDto) },
        { $ref: getSchemaPath(UpdateEmailAttendeeWorkflowStepDto) },
        { $ref: getSchemaPath(UpdateEmailHostWorkflowStepDto) },
        { $ref: getSchemaPath(UpdatePhoneAttendeeWorkflowStepDto) },
        { $ref: getSchemaPath(UpdatePhoneWhatsAppNumberWorkflowStepDto) },
        { $ref: getSchemaPath(UpdateWhatsAppAttendeePhoneWorkflowStepDto) },
        { $ref: getSchemaPath(UpdatePhoneNumberWorkflowStepDto) },
      ],
    },
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
