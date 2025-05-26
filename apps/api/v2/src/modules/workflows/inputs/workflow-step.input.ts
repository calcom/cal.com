import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsNumber, ValidateIf, IsBoolean, IsString, ValidateNested, IsOptional, IsIn } from "class-validator";

export const EMAIL_HOST = "email_host";
export const EMAIL_ATTENDEE = "email_attendee";
export const EMAIL_ADDRESS = "email_address";
export const SMS_ATTENDEE = "sms_attendee";
export const SMS_NUMBER = "sms_number";
export const WHATSAPP_ATTENDEE = "whatsapp_number";
export const WHATSAPP_NUMBER = "whatsapp_number";

export const STEP_ACTIONS = [
  EMAIL_HOST,
  EMAIL_ATTENDEE,
  EMAIL_ADDRESS,
  SMS_ATTENDEE,
  SMS_NUMBER,
  WHATSAPP_ATTENDEE,
  WHATSAPP_NUMBER,
] as const;

export type StepAction = (typeof STEP_ACTIONS)[number];
export const REMINDER = "reminder";
export const CUSTOM = "custom";
export const TEMPLATES = [REMINDER, CUSTOM] as const;
export type TemplateType = (typeof TEMPLATES)[number];
export type StepActionsType = (typeof STEP_ACTIONS)[number];

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
    required: false,
  })
  @IsOptional()
  @IsString()
  html?: string;
}

export class TextWorkflowMessageDto extends BaseWorkflowMessageDto {
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

export class WorkflowEmailHostStepDto extends BaseWorkflowStepDto {
  @ApiProperty({ description: "Action to perform", example: EMAIL_HOST, enum: STEP_ACTIONS })
  @IsString()
  @IsIn(STEP_ACTIONS)
  action: typeof EMAIL_HOST = EMAIL_HOST;

  @ApiPropertyOptional({
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
  @ApiProperty({ description: "Action to perform", example: EMAIL_ADDRESS, enum: STEP_ACTIONS })
  @IsString()
  @IsIn(STEP_ACTIONS)
  action: typeof EMAIL_ADDRESS = EMAIL_ADDRESS;

  @ApiPropertyOptional({
    description: "Email address if recipient is EMAIL, required for action EMAIL_ADDRESS",
    example: "31214",
    required: false,
    externalDocs: {
      url: "https://cal.com/docs/api-reference/v2/organization-team-verified-resources/verify-an-email-for-an-org-team",
    },
  })
  @IsNumber()
  verifiedEmailId?: number;

  @ApiPropertyOptional({
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
  @ApiProperty({ description: "Action to perform", example: EMAIL_ATTENDEE, enum: STEP_ACTIONS })
  @IsString()
  @IsIn(STEP_ACTIONS)
  action: typeof EMAIL_ATTENDEE = EMAIL_ATTENDEE;

  @ApiPropertyOptional({
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
  @ApiProperty({ description: "Action to perform", example: WHATSAPP_NUMBER })
  @IsString()
  @IsIn(STEP_ACTIONS)
  action: typeof WHATSAPP_NUMBER = WHATSAPP_NUMBER;

  @ApiPropertyOptional({
    description:
      "Phone number if recipient is PHONE_NUMBER, required for actions SMS_NUMBER and WHATSAPP_NUMBER",
    example: "3243434",
    required: false,
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
  @ApiProperty({ description: "Action to perform", example: SMS_ATTENDEE })
  @IsString()
  @IsIn(STEP_ACTIONS)
  action: typeof SMS_ATTENDEE = SMS_ATTENDEE;

  @ApiPropertyOptional({
    description:
      "Phone number if recipient is PHONE_NUMBER, required for actions SMS_NUMBER and WHATSAPP_NUMBER",
    example: "3243434",
    required: false,
    externalDocs: {
      url: "https://cal.com/docs/api-reference/v2/organization-team-verified-resources/verify-a-phone-number-for-an-org-team",
    },
  })
  @ApiProperty({ description: "Message content for this step", type: TextWorkflowMessageDto })
  @ValidateNested()
  @Type(() => TextWorkflowMessageDto)
  message!: TextWorkflowMessageDto;
}

export class WorkflowPhoneNumberStepDto extends BaseWorkflowStepDto {
  @ApiProperty({ description: "Action to perform", example: SMS_NUMBER })
  @IsString()
  @IsIn(STEP_ACTIONS)
  action: typeof SMS_NUMBER = SMS_NUMBER;

  @ApiPropertyOptional({
    description:
      "Phone number if recipient is PHONE_NUMBER, required for actions SMS_NUMBER and WHATSAPP_NUMBER",
    example: "3243434",
    required: false,
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

  @ApiProperty({ description: "Message content for this step", type: TextWorkflowMessageDto })
  @ValidateNested()
  @Type(() => TextWorkflowMessageDto)
  message!: TextWorkflowMessageDto;
}
