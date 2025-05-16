import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  ArrayMinSize,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  ValidateIf,
} from "class-validator";

export enum WorkflowTriggerType {
  BEFORE_EVENT = "BEFORE_EVENT",
  EVENT_CANCELLED = "EVENT_CANCELLED",
  NEW_EVENT = "NEW_EVENT",
  AFTER_EVENT = "AFTER_EVENT",
  RESCHEDULE_EVENT = "RESCHEDULE_EVENT",
}

export enum WorkflowTimeUnit {
  HOUR = "HOUR",
  MINUTE = "MINUTE",
  DAY = "DAY",
}

export enum RecipientType {
  HOST = "HOST",
  ATTENDEE = "ATTENDEE",
  EMAIL = "EMAIL",
  PHONE_NUMBER = "PHONE_NUMBER",
}

export enum StepAction {
  EMAIL_HOST = "EMAIL_HOST",
  EMAIL_ATTENDEE = "EMAIL_ATTENDEE",
  EMAIL_ADDRESS = "EMAIL_ADDRESS",
  SMS_ATTENDEE = "SMS_ATTENDEE",
  SMS_NUMBER = "SMS_NUMBER",
  WHATSAPP_ATTENDEE = "WHATSAPP_ATTENDEE",
  WHATSAPP_NUMBER = "WHATSAPP_NUMBER",
}

export enum TemplateType {
  REMINDER = "REMINDER",
  CUSTOM = "CUSTOM",
}

export class WorkflowActivationDto {
  @ApiProperty({
    description: "Whether the workflow is active for all the event-types",
    example: false,
    type: Boolean,
  })
  @IsBoolean()
  isActiveOnAllEventTypes!: boolean;

  @ApiPropertyOptional({
    description: "List of active calendar IDs the workflow applies to, required if isActiveOnAll is false",
    example: [698191],
    type: [Number],
  })
  @ValidateIf((o) => !Boolean(o.isActiveOnAll))
  @IsOptional()
  @IsNumber({}, { each: true })
  activeOnEventTypeIds?: number[] = [];
}

export class WorkflowTriggerOffsetDto {
  @ApiProperty({ description: "Time value for offset before/after event trigger", example: 24, type: Number })
  @IsNumber()
  value!: number;

  @ApiProperty({ description: "Unit for the offset time", example: "HOUR", enum: WorkflowTimeUnit })
  @IsEnum(WorkflowTimeUnit)
  unit!: WorkflowTimeUnit;
}

export class WorkflowTriggerDto {
  @ApiProperty({
    description: "Trigger type for the workflow",
    example: "BEFORE_EVENT",
    enum: WorkflowTriggerType,
  })
  @IsEnum(WorkflowTriggerType)
  type!: WorkflowTriggerType;

  @ApiPropertyOptional({
    description: "Offset before/after the trigger time; required for BEFORE_EVENT and AFTER_EVENT only",
    type: WorkflowTriggerOffsetDto,
    required: false,
  })
  @ValidateIf((o) =>
    Boolean(
      o.type && (o.type === WorkflowTriggerType.BEFORE_EVENT || o.type === WorkflowTriggerType.AFTER_EVENT)
    )
  )
  @ValidateNested()
  @Type(() => WorkflowTriggerOffsetDto)
  @IsOptional()
  offset?: WorkflowTriggerOffsetDto;
}

export class WorkflowMessageDto {
  @ApiProperty({
    description: "Subject of the message",
    example: "Reminder: Your Meeting {EVENT_NAME} - {EVENT_DATE_ddd, MMM D, YYYY h:mma} with Cal.com",
  })
  @IsString()
  subject!: string;

  @ApiProperty({
    description: "HTML content of the message (used for Emails)",
    example:
      "<p>This is a reminder from {ORGANIZER} of {EVENT_NAME} to {ATTENDEE} starting here  {LOCATION} {MEETING_URL} at {START_TIME_h:mma} {TIMEZONE}.</p>",
    required: false,
  })
  @IsOptional()
  @IsString()
  html?: string;

  @ApiProperty({
    description: "Text content of the message (used for SMS)",
    example:
      "This is a reminder message from {ORGANIZER} of {EVENT_NAME} to {ATTENDEE} starting here {LOCATION} {MEETING_URL} at {START_TIME_h:mma} {TIMEZONE}.",
    required: false,
  })
  @IsOptional()
  @IsString()
  text?: string;
}

export class WorkflowStepDto {
  @ApiProperty({ description: "Step number in the workflow sequence", example: 1 })
  @IsNumber()
  stepNumber!: number;

  @ApiProperty({ description: "Action to perform", example: "EMAIL_HOST", enum: StepAction })
  @IsEnum(StepAction)
  action!: StepAction;

  @ApiProperty({ description: "Recipient type", example: "ATTENDEE", enum: RecipientType })
  @IsEnum(RecipientType)
  recipient!: RecipientType;

  @ApiPropertyOptional({
    description: "Email address if recipient is EMAIL, required for action EMAIL_ADDRESS",
    example: "31214",
    required: false,
    externalDocs: {
      url: "https://cal.com/docs/api-reference/v2/organization-team-verified-resources/verify-an-email-for-an-org-team",
    },
  })
  @ValidateIf((o) => Boolean(o.action && o.action === StepAction.EMAIL_ADDRESS))
  @IsNumber()
  verifiedEmailId?: number;

  @ApiPropertyOptional({
    description:
      "Phone number if recipient is PHONE_NUMBER, required for actions SMS_NUMBER and WHATSAPP_NUMBER",
    example: "3243434",
    required: false,
    externalDocs: {
      url: "https://cal.com/docs/api-reference/v2/organization-team-verified-resources/verify-a-phone-number-for-an-org-team",
    },
  })
  @ValidateIf((o) =>
    Boolean(o.action && (o.action === StepAction.SMS_NUMBER || o.action === StepAction.WHATSAPP_NUMBER))
  )
  @IsNumber()
  verifiedPhoneId?: number;

  @ApiProperty({ description: "Template type for the step", example: "REMINDER", enum: TemplateType })
  @IsEnum(TemplateType)
  template!: TemplateType;

  @ApiPropertyOptional({
    description:
      "Whether to include a calendar event in the notification, can be included with actions EMAIL_HOST, EMAIL_ATTENDEE, EMAIL_ADDRESS ",
    example: true,
  })
  @ValidateIf((o) =>
    Boolean(
      o.action &&
        (o.action === StepAction.EMAIL_HOST ||
          o.action === StepAction.EMAIL_ADDRESS ||
          o.action === StepAction.EMAIL_ATTENDEE)
    )
  )
  @IsBoolean()
  includeCalendarEvent = false;

  @ApiProperty({ description: "Displayed sender name.", type: String })
  @IsString()
  sender!: string;

  @ApiProperty({ description: "Message content for this step", type: WorkflowMessageDto })
  @ValidateNested()
  @Type(() => WorkflowMessageDto)
  message!: WorkflowMessageDto;
}

export class UpdateWorkflowStepDto extends WorkflowStepDto {
  @ApiProperty({
    description:
      "Unique identifier of the step you want to update, if adding a new step do not provide this id",
    example: 67244,
  })
  @IsNumber()
  id?: number;
}

export class CreateWorkflowDto {
  @ApiProperty({ description: "Name of the workflow", example: "Platform Test Workflow" })
  @IsString()
  name!: string;

  @ApiProperty({ description: "Activation settings for the workflow", type: WorkflowActivationDto })
  @ValidateNested()
  @Type(() => WorkflowActivationDto)
  activation!: WorkflowActivationDto;

  @ApiProperty({ description: "Trigger configuration for the workflow", type: WorkflowTriggerDto })
  @ValidateNested()
  @Type(() => WorkflowTriggerDto)
  trigger!: WorkflowTriggerDto;

  @ApiProperty({ description: "Steps to execute as part of the workflow", type: [WorkflowStepDto] })
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: "Your workflow must contain at least one step." })
  @Type(() => WorkflowStepDto)
  steps!: WorkflowStepDto[];
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

  @ApiProperty({ description: "Trigger configuration for the workflow", type: WorkflowTriggerDto })
  @ValidateNested()
  @IsOptional()
  @Type(() => WorkflowTriggerDto)
  trigger?: WorkflowTriggerDto;

  @ApiProperty({ description: "Steps to execute as part of the workflow", type: [WorkflowStepDto] })
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: "Your workflow must contain at least one step." })
  @IsOptional()
  @Type(() => UpdateWorkflowStepDto)
  steps?: UpdateWorkflowStepDto[];
}
