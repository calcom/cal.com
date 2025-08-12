import { TeamsVerifiedResourcesRepository } from "@/modules/verified-resources/teams-verified-resources.repository";
import {
  UpdateWorkflowDto,
  UpdateWorkflowStepDto,
  UpdateEmailAttendeeWorkflowStepDto,
  UpdateEmailAddressWorkflowStepDto,
  UpdateEmailHostWorkflowStepDto,
} from "@/modules/workflows/inputs/update-workflow.input";
import { WorkflowType } from "@/modules/workflows/workflows.repository";
import { BadRequestException, Injectable } from "@nestjs/common";

import { TUpdateInputSchema } from "@calcom/platform-libraries/workflows";

import {
  EMAIL_ADDRESS,
  EMAIL_ATTENDEE,
  EMAIL_HOST,
  HtmlWorkflowMessageDto,
  SMS_ATTENDEE,
  SMS_NUMBER,
  STEP_ACTIONS_TO_ENUM,
  TemplateType,
  TextWorkflowMessageDto,
  WHATSAPP_ATTENDEE,
  WHATSAPP_NUMBER,
  WorkflowPhoneNumberStepDto,
  WorkflowPhoneWhatsAppNumberStepDto,
} from "../inputs/workflow-step.input";
import {
  OnAfterEventTriggerDto,
  OnBeforeEventTriggerDto,
  TIME_UNIT_TO_ENUM,
  WORKFLOW_TRIGGER_TO_ENUM,
} from "../inputs/workflow-trigger.input";

@Injectable()
export class WorkflowsInputService {
  constructor(private readonly teamsVerifiedResourcesRepository: TeamsVerifiedResourcesRepository) {}

  private async mapUpdateWorkflowStepToZodUpdateSchema(
    stepDto: UpdateWorkflowStepDto,
    index: number,
    teamId: number,
    workflowIdToUse: number
  ) {
    let reminderBody: string | null = null;
    let sendTo: string | null = null;
    const html = stepDto.message instanceof HtmlWorkflowMessageDto ? stepDto.message.html : null;
    const text = stepDto.message instanceof TextWorkflowMessageDto ? stepDto.message.text : null;
    const includeCalendarEvent =
      stepDto instanceof UpdateEmailAddressWorkflowStepDto ||
      stepDto instanceof UpdateEmailAttendeeWorkflowStepDto ||
      stepDto instanceof UpdateEmailHostWorkflowStepDto
        ? stepDto.includeCalendarEvent
        : false;

    switch (stepDto.action) {
      case EMAIL_HOST:
      case EMAIL_ATTENDEE:
      case EMAIL_ADDRESS:
        reminderBody = html ?? null;
        break;
      case SMS_ATTENDEE:
      case SMS_NUMBER:
      case WHATSAPP_ATTENDEE:
      case WHATSAPP_NUMBER:
        reminderBody = text ?? null;
        break;
    }
    if (stepDto.action === EMAIL_ADDRESS) {
      if (stepDto.verifiedEmailId) {
        const emailResource = await this.teamsVerifiedResourcesRepository.getTeamVerifiedEmailById(
          stepDto.verifiedEmailId,
          teamId
        );
        if (!emailResource?.email) {
          throw new BadRequestException("Invalid Verified Email Id.");
        }
        sendTo = emailResource.email;
      }
    } else if (stepDto.action === SMS_NUMBER || stepDto.action === WHATSAPP_NUMBER) {
      if (
        stepDto instanceof WorkflowPhoneNumberStepDto ||
        stepDto instanceof WorkflowPhoneWhatsAppNumberStepDto
      ) {
        if (stepDto.verifiedPhoneId) {
          const phoneResource = await this.teamsVerifiedResourcesRepository.getTeamVerifiedPhoneNumberById(
            stepDto.verifiedPhoneId,
            teamId
          );

          if (!phoneResource?.phoneNumber) {
            throw new BadRequestException("Invalid Verified Phone Id.");
          }

          sendTo = phoneResource.phoneNumber;
        }
      }
    }

    const actionForZod = STEP_ACTIONS_TO_ENUM[stepDto.action];
    const templateForZod = stepDto.template as unknown as Uppercase<TemplateType>;

    return {
      id: stepDto.id ?? -(index + 1),
      stepNumber: stepDto.stepNumber,
      action: actionForZod,
      workflowId: workflowIdToUse,
      sendTo: sendTo,
      reminderBody: reminderBody,
      emailSubject: stepDto.message.subject ?? null,
      template: templateForZod,
      numberRequired: null,
      sender: stepDto.sender ?? null,
      senderName: stepDto.sender ?? null,
      includeCalendarEvent: includeCalendarEvent,
    };
  }

  async mapUpdateDtoToZodUpdateSchema(
    updateDto: UpdateWorkflowDto,
    workflowIdToUse: number,
    teamId: number,
    currentData: WorkflowType
  ): Promise<TUpdateInputSchema> {
    const mappedSteps = updateDto?.steps
      ? await Promise.all(
          updateDto.steps.map(async (stepDto: UpdateWorkflowStepDto, index: number) =>
            this.mapUpdateWorkflowStepToZodUpdateSchema(stepDto, index, teamId, workflowIdToUse)
          )
        )
      : currentData.steps.map((step) => ({ ...step, senderName: step.sender }));

    const triggerForZod = updateDto?.trigger?.type
      ? WORKFLOW_TRIGGER_TO_ENUM[updateDto?.trigger?.type]
      : currentData.trigger;
    const timeUnitForZod =
      updateDto.trigger instanceof OnBeforeEventTriggerDto ||
      updateDto.trigger instanceof OnAfterEventTriggerDto
        ? updateDto?.trigger?.offset?.unit ?? currentData.timeUnit ?? null
        : undefined;

    const updateData: TUpdateInputSchema = {
      id: workflowIdToUse,
      name: updateDto.name ?? currentData.name,
      activeOn:
        updateDto?.activation?.activeOnEventTypeIds ??
        currentData?.activeOn.map((active) => active.eventTypeId) ??
        [],
      steps: mappedSteps,
      trigger: triggerForZod,
      time:
        updateDto.trigger instanceof OnBeforeEventTriggerDto ||
        updateDto.trigger instanceof OnAfterEventTriggerDto
          ? updateDto?.trigger?.offset?.value ?? currentData?.time ?? null
          : null,
      timeUnit: timeUnitForZod ? TIME_UNIT_TO_ENUM[timeUnitForZod] : null,
      isActiveOnAll: updateDto?.activation?.isActiveOnAllEventTypes ?? currentData.isActiveOnAll ?? false,
    } as const satisfies TUpdateInputSchema;

    return updateData;
  }
}
