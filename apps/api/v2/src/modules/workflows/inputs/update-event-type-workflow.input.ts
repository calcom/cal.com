import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMinSize, IsOptional, IsString, ValidateNested } from "class-validator";
import { WorkflowActivationDto } from "./create-event-type-workflow.input";
import {
  BaseWorkflowStepDto,
  EMAIL_ADDRESS,
  EMAIL_ATTENDEE,
  EMAIL_HOST,
  SMS_ATTENDEE,
  SMS_NUMBER,
  STEP_ACTIONS,
  UpdateEmailAddressWorkflowStepDto,
  UpdateEmailAttendeeWorkflowStepDto,
  UpdateEmailHostWorkflowStepDto,
  UpdatePhoneAttendeeWorkflowStepDto,
  UpdatePhoneNumberWorkflowStepDto,
  UpdatePhoneWhatsAppNumberWorkflowStepDto,
  UpdateWhatsAppAttendeePhoneWorkflowStepDto,
  WHATSAPP_ATTENDEE,
  WHATSAPP_NUMBER,
} from "./workflow-step.input";
import {
  AFTER_EVENT,
  AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
  AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
  BEFORE_EVENT,
  BOOKING_NO_SHOW_UPDATED,
  BOOKING_PAID,
  BOOKING_PAYMENT_INITIATED,
  BOOKING_REJECTED,
  BOOKING_REQUESTED,
  EVENT_CANCELLED,
  EVENT_TYPE_WORKFLOW_TRIGGER_TYPES,
  EventTypeWorkflowTriggerDto,
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
  UpdateEmailAddressWorkflowStepDto,
  UpdateEmailAttendeeWorkflowStepDto,
  UpdateEmailHostWorkflowStepDto,
  UpdatePhoneAttendeeWorkflowStepDto,
  UpdatePhoneWhatsAppNumberWorkflowStepDto,
  UpdateWhatsAppAttendeePhoneWorkflowStepDto,
  UpdatePhoneNumberWorkflowStepDto,
  EventTypeWorkflowTriggerDto,
  WorkflowActivationDto
)
export class UpdateEventTypeWorkflowDto {
  @ApiPropertyOptional({ description: "Name of the workflow", example: "Platform Test Workflow" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: "Activation settings for the workflow",
    type: WorkflowActivationDto,
  })
  @ValidateNested()
  @Type(() => WorkflowActivationDto)
  @IsOptional()
  activation?: WorkflowActivationDto;

  @ApiPropertyOptional({
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
  @IsOptional()
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
  trigger?:
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
    | OnAfterCalVideoHostsNoShowTriggerDto;

  @ApiPropertyOptional({
    description: `Steps to execute as part of the event-type workflow, allowed steps are ${STEP_ACTIONS.toString()}`,
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
  @ArrayMinSize(1, {
    message: `Your workflow must contain at least one allowed step. allowed steps are ${STEP_ACTIONS.toString()}`,
  })
  @IsOptional()
  @Type(() => BaseWorkflowStepDto, {
    keepDiscriminatorProperty: true,
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
