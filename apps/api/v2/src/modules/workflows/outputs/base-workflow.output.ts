import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsBoolean, IsOptional, ValidateNested } from "class-validator";
import {
  HOST,
  RECIPIENT_TYPES,
  REMINDER,
  RecipientType,
  TEMPLATES,
  TemplateType,
} from "@/modules/workflows/inputs/workflow-step.input";
import { HOUR, TIME_UNITS, TimeUnitType } from "@/modules/workflows/inputs/workflow-trigger.input";

export class WorkflowMessageOutputDto {
  @ApiProperty({
    description: "Subject of the message",
    example: "Reminder: Your Meeting {EVENT_NAME} - {EVENT_DATE_ddd, MMM D, YYYY h:mma} with Cal.com",
  })
  @Expose()
  subject!: string;

  @ApiPropertyOptional({
    description: "HTML content of the message",
    example: "<p>Reminder for {EVENT_NAME}.</p>",
  })
  @Expose()
  html?: string;

  @ApiPropertyOptional({
    description: "Text content of the message (used for SMS/WhatsApp)",
    example: "Reminder for {EVENT_NAME}.",
  })
  @Expose()
  text?: string;
}

export class BaseWorkflowStepOutputDto {
  @ApiProperty({ description: "Unique identifier of the step", example: 67244 })
  @Expose()
  id!: number;

  @ApiProperty({ description: "Step number in the workflow sequence", example: 1 })
  @Expose()
  stepNumber!: number;

  @ApiProperty({ description: "Intended recipient type", example: HOST, enum: RECIPIENT_TYPES })
  @Expose()
  recipient!: RecipientType;

  @ApiPropertyOptional({ description: "Verified Email  if action is EMAIL_ADDRESS", example: 31214 })
  @Expose()
  email?: string;

  @ApiPropertyOptional({
    description: "Verified Phone if action is SMS_NUMBER or WHATSAPP_NUMBER",
  })
  @Expose()
  phone?: string;

  @ApiPropertyOptional({
    description: "whether or not the attendees are required to provide their phone numbers when booking",
    example: true,
    default: false,
  })
  @IsBoolean()
  @Expose()
  @IsOptional()
  phoneRequired?: boolean;

  @ApiProperty({ description: "Template type used", example: REMINDER, enum: TEMPLATES })
  @Expose()
  template!: TemplateType;

  @ApiPropertyOptional({
    description: "Whether a calendar event (.ics) was included (for email actions)",
    example: true,
  })
  @Expose()
  includeCalendarEvent = false;

  @ApiProperty({ description: "Displayed sender name used for this step", example: "Cal.com Notifications" })
  @Expose()
  sender!: string;

  @ApiProperty({ description: "Message content for this step", type: WorkflowMessageOutputDto })
  @Expose()
  @ValidateNested()
  @Type(() => WorkflowMessageOutputDto)
  message!: WorkflowMessageOutputDto;
}

export class WorkflowTriggerOffsetOutputDto {
  @ApiProperty({ description: "Time value for offset", example: 24 })
  @Expose()
  value!: number;

  @ApiProperty({
    description: "Unit for the offset time",
    example: HOUR,
    enum: TIME_UNITS,
  })
  @Expose()
  unit!: TimeUnitType;
}

export class BaseWorkflowOutput {
  @ApiProperty({ description: "Unique identifier of the workflow", example: 101 })
  @Expose()
  id!: number;

  @ApiProperty({ description: "Name of the workflow", example: "Platform Test Workflow" })
  @Expose()
  name!: string;

  @ApiPropertyOptional({
    description: "ID of the user who owns the workflow (if not team-owned)",
    example: 2313,
  })
  @Expose()
  userId?: number;

  @ApiPropertyOptional({ description: "ID of the team owning the workflow", example: 4214321 })
  @Expose()
  teamId?: number;

  @ApiPropertyOptional({ description: "Timestamp of creation", example: "2024-05-12T10:00:00.000Z" })
  @Expose()
  createdAt?: Date | string;

  @ApiPropertyOptional({ description: "Timestamp of last update", example: "2024-05-12T11:30:00.000Z" })
  @Expose()
  updatedAt?: Date | string;
}
