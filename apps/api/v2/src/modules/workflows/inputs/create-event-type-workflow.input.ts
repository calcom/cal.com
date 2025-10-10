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
} from "class-validator";

import {
  BaseWorkflowStepDto,
  EMAIL_ADDRESS,
  EMAIL_ATTENDEE,
  EMAIL_HOST,
  SMS_ATTENDEE,
  SMS_NUMBER,
  STEP_ACTIONS,
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
  EventTypeWorkflowTriggerDto,
  BEFORE_EVENT,
  BOOKING_NO_SHOW_UPDATED,
  BOOKING_PAID,
  BOOKING_PAYMENT_INITIATED,
  BOOKING_REJECTED,
  BOOKING_REQUESTED,
  EVENT_CANCELLED,
  EVENT_TYPE_WORKFLOW_TRIGGER_TYPES,
  NEW_EVENT,
  OnAfterCalVideoGuestsNoShowTriggerDto,
  OnAfterCalVideoHostsNoShowTriggerDto,
  OnAfterEventTriggerDto,
  OnBeforeEventTriggerDto,
  OnCancelTriggerDto,
  OnCreationTriggerDto,
  OnNoShowUpdateTriggerDto,
  OnPaidTriggerDto,
  OnPaymentInitiatedTriggerDto,
  OnRejectedTriggerDto,
  OnRequestedTriggerDto,
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

@ApiExtraModels(
  OnBeforeEventTriggerDto,
  OnAfterEventTriggerDto,
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
  EventTypeWorkflowTriggerDto,
  WorkflowActivationDto
)
export class CreateEventTypeWorkflowDto {
  @ApiProperty({ description: "Name of the workflow", example: "Platform Test Workflow" })
  @IsString()
  name!: string;

  @ApiProperty({
    description: "Activation settings for the workflow",
    type: WorkflowActivationDto,
  })
  @ValidateNested()
  @Type(() => WorkflowActivationDto)
  activation!: WorkflowActivationDto;

  @ApiProperty({
    description: `Trigger configuration for the event-type workflow, allowed triggers are ${EVENT_TYPE_WORKFLOW_TRIGGER_TYPES.toString()}`,
    oneOf: [
      { $ref: getSchemaPath(OnBeforeEventTriggerDto) },
      { $ref: getSchemaPath(OnAfterEventTriggerDto) },
      { $ref: getSchemaPath(OnCancelTriggerDto) },
      { $ref: getSchemaPath(OnCreationTriggerDto) },
      { $ref: getSchemaPath(OnRescheduleTriggerDto) },
      { $ref: getSchemaPath(OnAfterCalVideoGuestsNoShowTriggerDto) },
      { $ref: getSchemaPath(OnAfterCalVideoHostsNoShowTriggerDto) },
      { $ref: getSchemaPath(OnRejectedTriggerDto) },
      { $ref: getSchemaPath(OnRequestedTriggerDto) },
      { $ref: getSchemaPath(OnPaidTriggerDto) },
      { $ref: getSchemaPath(OnPaymentInitiatedTriggerDto) },
      { $ref: getSchemaPath(OnNoShowUpdateTriggerDto) },
    ],
  })
  @ValidateNested()
  @Type(() => EventTypeWorkflowTriggerDto, {
    keepDiscriminatorProperty: true,
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
    | OnAfterCalVideoGuestsNoShowTriggerDto;

  @ApiProperty({
    description: `Steps to execute as part of the event-type workflow, allowed steps are ${STEP_ACTIONS.toString()}`,
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
  @ArrayMinSize(1, {
    message: `Your workflow must contain at least one allowed step. allowed steps are ${STEP_ACTIONS.toString()}`,
  })
  @Type(() => BaseWorkflowStepDto, {
    keepDiscriminatorProperty: true,
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
