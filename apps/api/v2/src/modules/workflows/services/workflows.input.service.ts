import { TeamsVerifiedResourcesRepository } from "@/modules/verified-resources/teams-verified-resources.repository";
import { UpdateEventTypeWorkflowDto } from "@/modules/workflows/inputs/update-event-type-workflow.input";
import { UpdateFormWorkflowDto } from "@/modules/workflows/inputs/update-form-workflow.input";
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
  UpdateWorkflowStepDto,
  WHATSAPP_ATTENDEE,
  WHATSAPP_NUMBER,
} from "../inputs/workflow-step.input";
import {
  OffsetTriggerDTOInstances,
  OffsetTriggerDTOInstancesType,
  TIME_UNIT_TO_ENUM,
  WORKFLOW_TRIGGER_TO_ENUM,
} from "../inputs/workflow-trigger.input";

@Injectable()
export class WorkflowsInputService {
  constructor(private readonly teamsVerifiedResourcesRepository: TeamsVerifiedResourcesRepository) {}

  private _isOffsetTrigger(
    trigger: UpdateEventTypeWorkflowDto["trigger"] | UpdateFormWorkflowDto["trigger"]
  ): trigger is OffsetTriggerDTOInstancesType {
    return OffsetTriggerDTOInstances.some((Instance) => trigger instanceof Instance);
  }

  private async _getTeamPhoneNumberFromVerifiedId(teamId: number, verifiedPhoneId: number) {
    const phoneResource = await this.teamsVerifiedResourcesRepository.getTeamVerifiedPhoneNumberById(
      verifiedPhoneId,
      teamId
    );

    if (!phoneResource?.phoneNumber) {
      throw new BadRequestException("Invalid Verified Phone Id.");
    }

    return phoneResource.phoneNumber;
  }

  private async _getTeamEmailFromVerifiedId(teamId: number, verifiedEmailId: number) {
    const emailResource = await this.teamsVerifiedResourcesRepository.getTeamVerifiedEmailById(
      verifiedEmailId,
      teamId
    );
    if (!emailResource?.email) {
      throw new BadRequestException("Invalid Verified Email Id.");
    }

    return emailResource.email;
  }

  private async mapUpdateWorkflowStepToZodUpdateSchema(
    stepDto: UpdateWorkflowStepDto,
    index: number,
    teamId: number,
    workflowIdToUse: number
  ) {
    let reminderBody: string | null = null;
    let sendTo: string | null = null;
    let phoneRequired: boolean | null = null;
    const html = stepDto.message instanceof HtmlWorkflowMessageDto ? stepDto.message.html : null;
    const text = stepDto.message instanceof TextWorkflowMessageDto ? stepDto.message.text : null;
    let includeCalendarEvent = false;

    switch (stepDto.action) {
      case EMAIL_HOST:
      case EMAIL_ATTENDEE:
      case EMAIL_ADDRESS:
        reminderBody = html ?? null;
        includeCalendarEvent = stepDto.includeCalendarEvent;
        break;
      case SMS_ATTENDEE:
        phoneRequired = stepDto.phoneRequired ?? false;
        break;
      case SMS_NUMBER:
        break;
      case WHATSAPP_ATTENDEE:
        phoneRequired = stepDto.phoneRequired ?? false;
        break;
      case WHATSAPP_NUMBER:
        reminderBody = text ?? null;
        break;
    }
    if (stepDto.action === EMAIL_ADDRESS) {
      if (stepDto.verifiedEmailId) {
        sendTo = await this._getTeamEmailFromVerifiedId(teamId, stepDto.verifiedEmailId);
      }
    } else if (stepDto.action === SMS_NUMBER || stepDto.action === WHATSAPP_NUMBER) {
      if (stepDto.verifiedPhoneId) {
        sendTo = await this._getTeamPhoneNumberFromVerifiedId(teamId, stepDto.verifiedPhoneId);
      }
    }

    const actionForZod = STEP_ACTIONS_TO_ENUM[stepDto.action];
    const templateForZod = stepDto?.template?.toUpperCase() as unknown as Uppercase<TemplateType>;

    return {
      id: stepDto.id ?? -(index + 1),
      stepNumber: stepDto.stepNumber,
      action: actionForZod,
      workflowId: workflowIdToUse,
      sendTo: sendTo,
      reminderBody: reminderBody,
      emailSubject: stepDto.message.subject ?? null,
      template: templateForZod,
      numberRequired: phoneRequired,
      sender: stepDto.sender ?? null,
      senderName: stepDto.sender ?? null,
      includeCalendarEvent: includeCalendarEvent,
    };
  }

  private async _mapCommonWorkflowProperties(
    updateDto: UpdateEventTypeWorkflowDto | UpdateFormWorkflowDto,
    currentData: WorkflowType,
    teamId: number,
    workflowIdToUse: number
  ) {
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

    const timeUnitForZod = this._isOffsetTrigger(updateDto.trigger)
      ? updateDto?.trigger?.offset?.unit ?? currentData.timeUnit ?? null
      : undefined;

    const time = this._isOffsetTrigger(updateDto.trigger)
      ? updateDto?.trigger?.offset?.value ?? currentData?.time ?? null
      : null;

    const timeUnit = timeUnitForZod ? TIME_UNIT_TO_ENUM[timeUnitForZod] : null;

    return { mappedSteps, triggerForZod, time, timeUnit };
  }

  async mapEventTypeUpdateDtoToZodSchema(
    updateDto: UpdateEventTypeWorkflowDto,
    workflowIdToUse: number,
    teamId: number,
    currentData: WorkflowType
  ): Promise<TUpdateInputSchema> {
    const { mappedSteps, triggerForZod, time, timeUnit } = await this._mapCommonWorkflowProperties(
      updateDto,
      currentData,
      teamId,
      workflowIdToUse
    );

    const updateData: TUpdateInputSchema = {
      id: workflowIdToUse,
      name: updateDto.name ?? currentData.name,
      steps: mappedSteps,
      trigger: triggerForZod,
      time: time,
      timeUnit: timeUnit,

      // Event-type specific logic
      activeOnEventTypeIds:
        updateDto?.activation?.activeOnEventTypeIds ??
        currentData?.activeOn.map((active) => active.eventTypeId) ??
        [],
      isActiveOnAll: updateDto?.activation?.isActiveOnAllEventTypes ?? currentData.isActiveOnAll ?? false,

      // Explicitly set form-related fields to their default/empty state
      activeOnRoutingFormIds: [],
    } as const satisfies TUpdateInputSchema;

    return updateData;
  }

  async mapFormUpdateDtoToZodSchema(
    updateDto: UpdateFormWorkflowDto,
    workflowIdToUse: number,
    teamId: number,
    currentData: WorkflowType
  ): Promise<TUpdateInputSchema> {
    const { mappedSteps, triggerForZod, time, timeUnit } = await this._mapCommonWorkflowProperties(
      updateDto,
      currentData,
      teamId,
      workflowIdToUse
    );

    const updateData: TUpdateInputSchema = {
      id: workflowIdToUse,
      name: updateDto.name ?? currentData.name,
      steps: mappedSteps,
      trigger: triggerForZod,
      time: time,
      timeUnit: timeUnit,

      // Form-specific logic
      activeOnRoutingFormIds:
        updateDto?.activation?.activeOnRoutingFormIds ??
        currentData?.activeOnRoutingForms.map((active) => active.routingFormId) ??
        [],
      isActiveOnAll: updateDto?.activation?.isActiveOnAllRoutingForms ?? currentData.isActiveOnAll ?? false,

      // Explicitly set event-type-related fields to their default/empty state
      activeOnEventTypeIds: [],
    } as const satisfies TUpdateInputSchema;

    return updateData;
  }
}
