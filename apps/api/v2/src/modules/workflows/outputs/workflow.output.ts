import {
  StepAction,
  RecipientType,
  TemplateType,
  WorkflowTimeUnit,
  WorkflowTriggerType,
} from "@/modules/workflows/inputs/create-workflow.input";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsArray, IsEnum, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

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

export class WorkflowStepOutputDto {
  @ApiProperty({ description: "Unique identifier of the step", example: 67244 })
  @Expose()
  id!: number; // Changed from stepId for consistency

  @ApiProperty({ description: "Step number in the workflow sequence", example: 1 })
  @Expose()
  stepNumber!: number;

  @ApiProperty({ description: "Action to perform", example: StepAction.EMAIL_HOST, enum: StepAction })
  @Expose()
  @IsEnum(StepAction)
  action!: StepAction;

  @ApiProperty({ description: "Intended recipient type", example: RecipientType.HOST, enum: RecipientType })
  @Expose()
  @IsEnum(RecipientType)
  recipient!: RecipientType; // Reflects the intended recipient logic

  @ApiPropertyOptional({ description: "Verified Email  if action is EMAIL_ADDRESS", example: 31214 })
  @Expose()
  email?: string;

  @ApiPropertyOptional({
    description: "Verified Phone if action is SMS_NUMBER or WHATSAPP_NUMBER",
  })
  @Expose()
  phone?: string;

  @ApiProperty({ description: "Template type used", example: TemplateType.REMINDER, enum: TemplateType })
  @Expose()
  @IsEnum(TemplateType)
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
    example: WorkflowTimeUnit.HOUR,
    enum: WorkflowTimeUnit,
  })
  @Expose()
  @IsEnum(WorkflowTimeUnit)
  unit!: WorkflowTimeUnit;
}

export class WorkflowTriggerOutputDto {
  @ApiProperty({
    description: "Trigger type for the workflow",
    example: WorkflowTriggerType.BEFORE_EVENT,
    enum: WorkflowTriggerType,
  })
  @Expose()
  @IsEnum(WorkflowTriggerType)
  type!: WorkflowTriggerType;

  @ApiPropertyOptional({
    description: "Offset details (present for BEFORE_EVENT/AFTER_EVENT)",
    type: WorkflowTriggerOffsetOutputDto,
  })
  @Expose()
  @ValidateNested()
  @Type(() => WorkflowTriggerOffsetOutputDto)
  offset?: WorkflowTriggerOffsetOutputDto;
}

export class WorkflowActivationOutputDto {
  @ApiProperty({
    description: "Whether the workflow is active for all event types associated with the team/user",
    example: false,
  })
  @Expose()
  isActiveOnAllEventTypes!: boolean;

  @ApiPropertyOptional({
    description: "List of Event Type IDs the workflow is specifically active on (if not active on all)",
    example: [698191, 698192],
  })
  @Expose()
  @IsArray()
  activeOnEventTypeIds?: number[];
}

// --- Main Workflow Output DTO ---

export class WorkflowOutput {
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

  @ApiProperty({ description: "Activation settings (scope)", type: WorkflowActivationOutputDto })
  @Expose()
  @ValidateNested()
  @Type(() => WorkflowActivationOutputDto)
  activation!: WorkflowActivationOutputDto;

  @ApiProperty({ description: "Trigger configuration", type: WorkflowTriggerOutputDto })
  @Expose()
  @ValidateNested()
  @Type(() => WorkflowTriggerOutputDto)
  trigger!: WorkflowTriggerOutputDto;

  @ApiProperty({ description: "Steps comprising the workflow", type: [WorkflowStepOutputDto] })
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepOutputDto)
  steps!: WorkflowStepOutputDto[];

  // Assuming these fields are available from Prisma (add @updatedAt, @createdAt in schema)
  @ApiPropertyOptional({ description: "Timestamp of creation", example: "2024-05-12T10:00:00.000Z" })
  @Expose()
  createdAt?: Date | string;

  @ApiPropertyOptional({ description: "Timestamp of last update", example: "2024-05-12T11:30:00.000Z" })
  @Expose()
  updatedAt?: Date | string;
}

// --- List Response Output DTO ---

export class GetWorkflowsOutput {
  @ApiProperty({
    description: "Indicates the status of the response",
    example: SUCCESS_STATUS,
    enum: [SUCCESS_STATUS, ERROR_STATUS],
  })
  @Expose()
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    description: "List of workflows",
    type: [WorkflowOutput],
  })
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowOutput)
  data!: WorkflowOutput[];
}

export class GetWorkflowOutput {
  @ApiProperty({
    description: "Indicates the status of the response",
    example: SUCCESS_STATUS,
    enum: [SUCCESS_STATUS, ERROR_STATUS],
  })
  @Expose()
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    description: "workflow",
    type: [WorkflowOutput],
  })
  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowOutput)
  data!: WorkflowOutput;
}
