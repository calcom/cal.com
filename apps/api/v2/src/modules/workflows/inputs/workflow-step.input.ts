import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsBoolean, IsString, ValidateNested, IsIn, IsOptional } from "class-validator";

import { WorkflowActions, WorkflowTemplates } from "@calcom/platform-libraries";

export const EMAIL_HOST = "email_host";
export const EMAIL_ATTENDEE = "email_attendee";
export const EMAIL_ADDRESS = "email_address";
export const SMS_ATTENDEE = "sms_attendee";
export const SMS_NUMBER = "sms_number";
export const WHATSAPP_ATTENDEE = "whatsapp_attendee";
export const WHATSAPP_NUMBER = "whatsapp_number";
export const CAL_AI_PHONE_CALL = "cal_ai_phone_call";

export const STEP_ACTIONS = [
  EMAIL_HOST,
  EMAIL_ATTENDEE,
  EMAIL_ADDRESS,
  SMS_ATTENDEE,
  SMS_NUMBER,
  WHATSAPP_ATTENDEE,
  WHATSAPP_NUMBER,
  CAL_AI_PHONE_CALL,
] as const;

export const FORM_ALLOWED_STEP_ACTIONS = [EMAIL_ATTENDEE, EMAIL_ADDRESS, SMS_ATTENDEE, SMS_NUMBER] as const;

export const STEP_ACTIONS_TO_ENUM = {
  [EMAIL_HOST]: WorkflowActions.EMAIL_HOST,
  [EMAIL_ATTENDEE]: WorkflowActions.EMAIL_ATTENDEE,
  [EMAIL_ADDRESS]: WorkflowActions.EMAIL_ADDRESS,
  [SMS_ATTENDEE]: WorkflowActions.SMS_ATTENDEE,
  [WHATSAPP_ATTENDEE]: WorkflowActions.WHATSAPP_ATTENDEE,
  [WHATSAPP_NUMBER]: WorkflowActions.WHATSAPP_NUMBER,
  [SMS_NUMBER]: WorkflowActions.SMS_NUMBER,
  [CAL_AI_PHONE_CALL]: WorkflowActions.CAL_AI_PHONE_CALL,
} as const;

export const ENUM_TO_STEP_ACTIONS = {
  [WorkflowActions.EMAIL_HOST]: EMAIL_HOST,
  [WorkflowActions.EMAIL_ATTENDEE]: EMAIL_ATTENDEE,
  [WorkflowActions.EMAIL_ADDRESS]: EMAIL_ADDRESS,
  [WorkflowActions.SMS_ATTENDEE]: SMS_ATTENDEE,
  [WorkflowActions.WHATSAPP_ATTENDEE]: WHATSAPP_ATTENDEE,
  [WorkflowActions.WHATSAPP_NUMBER]: WHATSAPP_NUMBER,
  [WorkflowActions.SMS_NUMBER]: SMS_NUMBER,
  [WorkflowActions.CAL_AI_PHONE_CALL]: CAL_AI_PHONE_CALL,
} as const;

export type StepAction = (typeof STEP_ACTIONS)[number];
export type FormAllowedStepAction = (typeof FORM_ALLOWED_STEP_ACTIONS)[number];

export const REMINDER = "reminder";
export const CUSTOM = "custom";
export const CANCELLED = "cancelled";
export const RESCHEDULED = "rescheduled";
export const COMPLETED = "completed";
export const RATING = "rating";
export const TEMPLATES = [REMINDER, CUSTOM, RESCHEDULED, COMPLETED, RATING, CANCELLED] as const;
export const TEMPLATES_TO_ENUM = {
  [WorkflowTemplates.REMINDER]: REMINDER,
  [CUSTOM]: WorkflowTemplates.CUSTOM,
  [RESCHEDULED]: WorkflowTemplates.RESCHEDULED,
  [CANCELLED]: WorkflowTemplates.CANCELLED,
  [COMPLETED]: WorkflowTemplates.COMPLETED,
  [RATING]: WorkflowTemplates.RATING,
} as const;

export const ENUM_TO_TEMPLATES = {
  [WorkflowTemplates.REMINDER]: REMINDER,
  [WorkflowTemplates.CUSTOM]: CUSTOM,
  [WorkflowTemplates.RESCHEDULED]: RESCHEDULED,
  [WorkflowTemplates.CANCELLED]: CANCELLED,
  [WorkflowTemplates.COMPLETED]: COMPLETED,
  [WorkflowTemplates.RATING]: RATING,
} as const;

export type TemplateType = (typeof TEMPLATES)[number];

export const HOST = "const";
export const ATTENDEE = "attendee";
export const EMAIL = "email";
export const PHONE_NUMBER = "phone_number";

export const RECIPIENT_TYPES = [HOST, ATTENDEE, EMAIL, PHONE_NUMBER];
export type RecipientType = (typeof RECIPIENT_TYPES)[number];

export class BaseWorkflowMessageDto {
  @ApiProperty({
    description: "Subject of the message",
    example: "Reminder: Your Meeting {EVENT_NAME} - {EVENT_DATE_ddd, MMM D, YYYY h:mma} with Cal.com",
  })
  @IsString()
  subject!: string;
}

export class HtmlWorkflowMessageDto extends BaseWorkflowMessageDto {
  @ApiProperty({
    description: "HTML content of the message (used for Emails)",
    example:
      "<p>This is a reminder from {ORGANIZER} of {EVENT_NAME} to {ATTENDEE} starting here  {LOCATION} {MEETING_URL} at {START_TIME_h:mma} {TIMEZONE}.</p>",
  })
  @IsString()
  html!: string;
}

export class TextWorkflowMessageDto extends BaseWorkflowMessageDto {
  @ApiProperty({
    description: "Text content of the message (used for SMS)",
    example:
      "This is a reminder message from {ORGANIZER} of {EVENT_NAME} to {ATTENDEE} starting here {LOCATION} {MEETING_URL} at {START_TIME_h:mma} {TIMEZONE}.",
  })
  @IsString()
  text!: string;
}

export class BaseWorkflowStepDto {
  @ApiProperty({ description: "Action to perform", example: EMAIL_HOST, enum: STEP_ACTIONS })
  @IsString()
  @IsIn(STEP_ACTIONS)
  action!: StepAction;

  @ApiProperty({ description: "Step number in the workflow sequence", example: 1 })
  @IsNumber()
  stepNumber!: number;

  @ApiProperty({ description: "Recipient type", example: ATTENDEE, enum: RECIPIENT_TYPES })
  recipient!: RecipientType;

  @ApiProperty({ description: "Template type for the step", example: REMINDER, enum: TEMPLATES })
  template!: TemplateType;

  @ApiProperty({ description: "Displayed sender name.", type: String })
  @IsString()
  sender!: string;
}

export class BaseFormWorkflowStepDto extends BaseWorkflowStepDto {
  @ApiProperty({ description: "Action to perform", example: EMAIL_HOST, enum: STEP_ACTIONS })
  @IsString()
  @IsIn(FORM_ALLOWED_STEP_ACTIONS)
  action!: FormAllowedStepAction;
}

export class WorkflowEmailHostStepDto extends BaseWorkflowStepDto {
  @ApiProperty({
    description: "Action to perform, send an email to the host of the event",
    example: EMAIL_HOST,
    enum: STEP_ACTIONS,
  })
  @IsString()
  @IsIn(STEP_ACTIONS)
  action: typeof EMAIL_HOST = EMAIL_HOST;

  @ApiProperty({
    description: `Whether to include a calendar event in the notification, can be included with actions ${EMAIL_HOST}, ${EMAIL_ATTENDEE}, ${EMAIL_ADDRESS}`,
    example: true,
  })
  @IsBoolean()
  includeCalendarEvent = false;

  @ApiProperty({ description: "Message content for this step", type: HtmlWorkflowMessageDto })
  @ValidateNested()
  @Type(() => HtmlWorkflowMessageDto)
  message!: HtmlWorkflowMessageDto;
}

export class WorkflowEmailAddressStepDto extends BaseWorkflowStepDto {
  @ApiProperty({
    description: "Action to perform, send an email to a specific email address",
    example: EMAIL_ADDRESS,
    enum: STEP_ACTIONS,
  })
  @IsString()
  @IsIn(STEP_ACTIONS)
  action: typeof EMAIL_ADDRESS = EMAIL_ADDRESS;

  @ApiProperty({
    description: "Email address if recipient is EMAIL, required for action EMAIL_ADDRESS",
    example: "31214",
    externalDocs: {
      url: "https://cal.com/docs/api-reference/v2/organization-team-verified-resources/verify-an-email-for-an-org-team",
    },
  })
  @IsNumber()
  verifiedEmailId!: number;

  @ApiProperty({
    description: `Whether to include a calendar event in the notification, can be included with actions ${EMAIL_HOST}, ${EMAIL_ATTENDEE}, ${EMAIL_ADDRESS}`,
    example: true,
  })
  @IsBoolean()
  includeCalendarEvent = false;

  @ApiProperty({ description: "Message content for this step", type: HtmlWorkflowMessageDto })
  @ValidateNested()
  @Type(() => HtmlWorkflowMessageDto)
  message!: HtmlWorkflowMessageDto;
}

export class WorkflowEmailAttendeeStepDto extends BaseWorkflowStepDto {
  @ApiProperty({
    description: "Action to perform, send an email to the attendees of the event",
    example: EMAIL_ATTENDEE,
    enum: STEP_ACTIONS,
  })
  @IsString()
  @IsIn(STEP_ACTIONS)
  action: typeof EMAIL_ATTENDEE = EMAIL_ATTENDEE;

  @ApiProperty({
    description: `Whether to include a calendar event in the notification, can be included with actions ${EMAIL_HOST}, ${EMAIL_ATTENDEE}, ${EMAIL_ADDRESS}`,
    example: true,
  })
  @IsBoolean()
  includeCalendarEvent = false;

  @ApiProperty({ description: "Message content for this step", type: HtmlWorkflowMessageDto })
  @ValidateNested()
  @Type(() => HtmlWorkflowMessageDto)
  message!: HtmlWorkflowMessageDto;
}

export class WorkflowPhoneWhatsAppNumberStepDto extends BaseWorkflowStepDto {
  @ApiProperty({
    description: "Action to perform, send a text message via whatsapp to a specific phone number",
    example: WHATSAPP_NUMBER,
  })
  @IsString()
  @IsIn(STEP_ACTIONS)
  action: typeof WHATSAPP_NUMBER = WHATSAPP_NUMBER;

  @ApiProperty({
    description:
      "Phone number if recipient is PHONE_NUMBER, required for actions SMS_NUMBER and WHATSAPP_NUMBER",
    example: "3243434",
    externalDocs: {
      url: "https://cal.com/docs/api-reference/v2/organization-team-verified-resources/verify-a-phone-number-for-an-org-team",
    },
  })
  @IsNumber()
  verifiedPhoneId!: number;

  @ApiProperty({ description: "Message content for this step", type: TextWorkflowMessageDto })
  @ValidateNested()
  @Type(() => TextWorkflowMessageDto)
  message!: TextWorkflowMessageDto;
}

export class WorkflowPhoneAttendeeStepDto extends BaseWorkflowStepDto {
  @ApiProperty({
    description: "Action to perform, send a text message to the phone numbers of the attendees",
    example: SMS_ATTENDEE,
  })
  @IsString()
  @IsIn(STEP_ACTIONS)
  action: typeof SMS_ATTENDEE = SMS_ATTENDEE;

  @ApiProperty({
    description:
      "Phone number if recipient is PHONE_NUMBER, required for actions SMS_NUMBER and WHATSAPP_NUMBER",
    example: "3243434",
    externalDocs: {
      url: "https://cal.com/docs/api-reference/v2/organization-team-verified-resources/verify-a-phone-number-for-an-org-team",
    },
  })
  @ApiProperty({ description: "Message content for this step", type: TextWorkflowMessageDto })
  @ValidateNested()
  @Type(() => TextWorkflowMessageDto)
  message!: TextWorkflowMessageDto;

  @ApiPropertyOptional({
    description: "whether or not the attendees are required to provide their phone numbers when booking",
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  phoneRequired: boolean = false;
}

export class WorkflowPhoneNumberStepDto extends BaseWorkflowStepDto {
  @ApiProperty({
    description: "Action to perform, send a text message to a specific phone number",
    example: SMS_NUMBER,
  })
  @IsString()
  @IsIn(STEP_ACTIONS)
  action: typeof SMS_NUMBER = SMS_NUMBER;

  @ApiProperty({
    description:
      "Phone number if recipient is PHONE_NUMBER, required for actions SMS_NUMBER and WHATSAPP_NUMBER",
    example: "3243434",
    externalDocs: {
      url: "https://cal.com/docs/api-reference/v2/organization-team-verified-resources/verify-a-phone-number-for-an-org-team",
    },
  })
  @IsNumber()
  verifiedPhoneId!: number;

  @ApiProperty({ description: "Message content for this step", type: TextWorkflowMessageDto })
  @ValidateNested()
  @Type(() => TextWorkflowMessageDto)
  message!: TextWorkflowMessageDto;
}

export class WorkflowPhoneWhatsAppAttendeeStepDto extends BaseWorkflowStepDto {
  @ApiProperty({ description: "Action to perform", example: WHATSAPP_ATTENDEE })
  @IsString()
  @IsIn(STEP_ACTIONS)
  action: typeof WHATSAPP_ATTENDEE = WHATSAPP_ATTENDEE;

  @ApiProperty({
    description:
      "Message content for this step, send a text message via whatsapp to the phone numbers of the attendees",
    type: TextWorkflowMessageDto,
  })
  @ValidateNested()
  @Type(() => TextWorkflowMessageDto)
  message!: TextWorkflowMessageDto;

  @ApiPropertyOptional({
    description: "whether or not the attendees are required to provide their phone numbers when booking",
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  phoneRequired: boolean = false;
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
