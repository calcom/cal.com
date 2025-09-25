import { WorkflowActivationPreValidation } from "@/modules/workflows/inputs/workflow-activation.validator";
import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  ArrayMinSize,
  IsNumber,
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
  AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
  AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
  BaseWorkflowTriggerDto,
  BEFORE_EVENT,
  BOOKING_NO_SHOW_UPDATED,
  BOOKING_PAID,
  BOOKING_PAYMENT_INITIATED,
  BOOKING_REJECTED,
  BOOKING_REQUESTED,
  EVENT_CANCELLED,
  FORM_SUBMITTED,
  NEW_EVENT,
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
  RESCHEDULE_EVENT,
} from "./workflow-trigger.input";

export const WORKFLOW_FORM_ACTIVATION = "form";
export const WORKFLOW_EVENT_TYPE_ACTIVATION = "event-type";
export const WORKFLOW_ACTIVATION_TYPES = [WORKFLOW_FORM_ACTIVATION, WORKFLOW_EVENT_TYPE_ACTIVATION] as const;

export type WorkflowActivationType = (typeof WORKFLOW_ACTIVATION_TYPES)[number];

export class BaseWorkflowActivationDto {
  @ApiProperty({
    description: "Trigger type for the workflow",
    default: WORKFLOW_EVENT_TYPE_ACTIVATION,
  })
  @IsString()
  @IsIn([WORKFLOW_ACTIVATION_TYPES, WORKFLOW_FORM_ACTIVATION])
  @IsOptional()
  type: WorkflowActivationType = WORKFLOW_EVENT_TYPE_ACTIVATION;
}

export class WorkflowActivationDto extends BaseWorkflowActivationDto {
  @ApiProperty({
    description: "Trigger type for the workflow",
    default: WORKFLOW_EVENT_TYPE_ACTIVATION,
  })
  @IsString()
  @IsIn([WORKFLOW_EVENT_TYPE_ACTIVATION])
  @IsOptional()
  type: typeof WORKFLOW_EVENT_TYPE_ACTIVATION = WORKFLOW_EVENT_TYPE_ACTIVATION;

  @ApiProperty({
    description: "Whether the workflow is active for all the event-types",
    example: false,
    type: Boolean,
  })
  @IsBoolean()
  isActiveOnAllEventTypes = false;

  @ApiPropertyOptional({
    description:
      "List of event-types IDs the workflow applies to, required if isActiveOnAllEventTypes is false",
    example: [698191],
    type: [Number],
  })
  @ValidateIf((o) => !o.isActiveOnAllEventTypes)
  @IsOptional()
  @IsNumber({}, { each: true })
  activeOnEventTypeIds: number[] = [];
}

export class WorkflowFormActivationDto extends BaseWorkflowActivationDto {
  @ApiProperty({
    description: "Trigger type for the workflow",
    default: WORKFLOW_FORM_ACTIVATION,
  })
  @IsString()
  @IsIn([WORKFLOW_FORM_ACTIVATION])
  @IsOptional()
  type: typeof WORKFLOW_FORM_ACTIVATION = WORKFLOW_FORM_ACTIVATION;

  @ApiProperty({
    description: "Whether the workflow is active for all the routing forms",
    example: false,
    type: Boolean,
  })
  @IsBoolean()
  isActiveOnAllRoutingForms = false;

  @ApiPropertyOptional({
    description: "List of routing form IDs the workflow applies to",
    example: [698191],
    type: [Number],
  })
  @ValidateIf((o) => !o.isActiveOnAllEventTypes)
  @IsOptional()
  @IsNumber({}, { each: true })
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
export class CreateWorkflowDto {
  @ApiProperty({ description: "Name of the workflow", example: "Platform Test Workflow" })
  @IsString()
  name!: string;

  @ApiProperty({
    description: "Activation settings for the workflow",
    oneOf: [
      { $ref: getSchemaPath(WorkflowActivationDto) },
      { $ref: getSchemaPath(WorkflowFormActivationDto) },
    ],
  })
  @ValidateNested()
  @Type(() => BaseWorkflowActivationDto, {
    discriminator: {
      property: "type",
      subTypes: [
        { value: WorkflowActivationDto, name: WORKFLOW_EVENT_TYPE_ACTIVATION },
        { value: WorkflowFormActivationDto, name: WORKFLOW_FORM_ACTIVATION },
      ],
    },
  })
  @WorkflowActivationPreValidation({
    message:
      "Workflow validation type does not work with the specified trigger type, when using FORM_SUBMITTED trigger you must provide form activation.",
  })
  activation!: WorkflowFormActivationDto | WorkflowActivationDto;

  @ApiProperty({
    description: "Trigger configuration for the workflow",
    oneOf: [
      { $ref: getSchemaPath(OnBeforeEventTriggerDto) },
      { $ref: getSchemaPath(OnAfterEventTriggerDto) },
      { $ref: getSchemaPath(OnCancelTriggerDto) },
      { $ref: getSchemaPath(OnCreationTriggerDto) },
      { $ref: getSchemaPath(OnRescheduleTriggerDto) },
      { $ref: getSchemaPath(OnAfterCalVideoGuestsNoShowTriggerDto) },
      { $ref: getSchemaPath(OnAfterCalVideoHostsNoShowTriggerDto) },
      { $ref: getSchemaPath(OnFormSubmittedTriggerDto) },
      { $ref: getSchemaPath(OnRejectedTriggerDto) },
      { $ref: getSchemaPath(OnRequestedTriggerDto) },
      { $ref: getSchemaPath(OnPaidTriggerDto) },
      { $ref: getSchemaPath(OnPaymentInitiatedTriggerDto) },
      { $ref: getSchemaPath(OnNoShowUpdateTriggerDto) },
    ],
  })
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
        { value: OnFormSubmittedTriggerDto, name: FORM_SUBMITTED },
        { value: OnRequestedTriggerDto, name: BOOKING_REQUESTED },
        { value: OnRejectedTriggerDto, name: BOOKING_REJECTED },
        { value: OnPaymentInitiatedTriggerDto, name: BOOKING_PAYMENT_INITIATED },
        { value: OnPaidTriggerDto, name: BOOKING_PAID },
        { value: OnNoShowUpdateTriggerDto, name: BOOKING_NO_SHOW_UPDATED },
      ],
    },
  })
  trigger!:
    | OnAfterEventTriggerDto
    | OnBeforeEventTriggerDto
    | OnCreationTriggerDto
    | OnRescheduleTriggerDto
    | OnCancelTriggerDto
    | OnRejectedTriggerDto
    | OnRequestedTriggerDto
    | OnPaidTriggerDto
    | OnPaymentInitiatedTriggerDto
    | OnNoShowUpdateTriggerDto
    | OnAfterCalVideoGuestsNoShowTriggerDto
    | OnFormSubmittedTriggerDto;

  @ApiProperty({
    description: "Steps to execute as part of the workflow",
    oneOf: [
      { $ref: getSchemaPath(WorkflowEmailAddressStepDto) },
      { $ref: getSchemaPath(WorkflowEmailAttendeeStepDto) },
      { $ref: getSchemaPath(WorkflowEmailHostStepDto) },
      { $ref: getSchemaPath(WorkflowPhoneWhatsAppAttendeeStepDto) },
      { $ref: getSchemaPath(WorkflowPhoneWhatsAppNumberStepDto) },
      { $ref: getSchemaPath(WorkflowPhoneNumberStepDto) },
      { $ref: getSchemaPath(WorkflowPhoneAttendeeStepDto) },
    ],
    type: "array",
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
