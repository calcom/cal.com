import { UserWithProfile } from "@/modules/users/users.repository";
import { TeamsVerifiedResourcesRepository } from "@/modules/verified-resources/teams-verified-resources.repository";
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowActivationDto,
  TriggerDtoType,
  UpdateWorkflowStepDto,
  UpdateEmailAttendeeWorkflowStepDto,
  UpdateEmailAddressWorkflowStepDto,
  UpdateEmailHostWorkflowStepDto,
} from "@/modules/workflows/inputs/create-workflow.input";
import { WorkflowOutput, WorkflowStepOutputDto } from "@/modules/workflows/outputs/workflow.output";
import { WorkflowsRepository, WorkflowType } from "@/modules/workflows/workflows.repository";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { TUpdateInputSchema } from "@calcom/platform-libraries/workflows";

import {
  ATTENDEE,
  EMAIL,
  EMAIL_ADDRESS,
  EMAIL_ATTENDEE,
  EMAIL_HOST,
  HOST,
  HtmlWorkflowMessageDto,
  PHONE_NUMBER,
  RecipientType,
  SMS_ATTENDEE,
  SMS_NUMBER,
  StepAction,
  StepActionsType,
  TemplateType,
  TextWorkflowMessageDto,
  WHATSAPP_ATTENDEE,
  WHATSAPP_NUMBER,
  WorkflowPhoneNumberStepDto,
  WorkflowPhoneWhatsAppNumberStepDto,
} from "../inputs/workflow-step.input";
import {
  AFTER_EVENT,
  BEFORE_EVENT,
  EVENT_CANCELLED,
  HOUR,
  OnAfterEventTriggerDto,
  OnBeforeEventTriggerDto,
  TimeUnitType,
  WorkflowTriggerType,
} from "../inputs/workflow-trigger.input";

@Injectable()
export class TeamWorkflowsService {
  constructor(
    private readonly workflowsRepository: WorkflowsRepository,
    private readonly teamsVerifiedResourcesRepository: TeamsVerifiedResourcesRepository
  ) {}

  async getTeamWorkflows(teamId: number, skip: number, take: number) {
    const workflows = await this.workflowsRepository.getTeamWorkflows(teamId, skip, take);

    return workflows.map((workflow) => this.toDto(workflow));
  }

  async getTeamWorkflowById(teamId: number, workflowId: number) {
    const workflow = await this.workflowsRepository.getTeamWorkflowById(teamId, workflowId);

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${workflowId} not found for team ${teamId}`);
    }

    return this.toDto(workflow);
  }

  async createTeamWorkflow(user: UserWithProfile, teamId: number, data: CreateWorkflowDto) {
    const workflowHusk = await this.workflowsRepository.createTeamWorkflowHusk(teamId);
    const mappedData = await this.mapUpdateDtoToZodUpdateSchema(data, workflowHusk.id, teamId, workflowHusk);
    const createdWorkflow = await this.workflowsRepository.updateTeamWorkflow(
      user,
      teamId,
      workflowHusk.id,
      mappedData
    );
    if (!createdWorkflow) {
      throw new BadRequestException(`Could not create Workflow in team ${teamId}`);
    }

    return this.toDto(createdWorkflow);
  }

  async updateTeamWorkflow(
    user: UserWithProfile,
    teamId: number,
    workflowId: number,
    data: UpdateWorkflowDto
  ) {
    const currentWorkflow = await this.workflowsRepository.getTeamWorkflowById(teamId, workflowId);

    if (!currentWorkflow) {
      throw new NotFoundException(`Workflow with ID ${workflowId} not found for team ${teamId}`);
    }
    const mappedData = await this.mapUpdateDtoToZodUpdateSchema(data, workflowId, teamId, currentWorkflow);

    const updatedWorkflow = await this.workflowsRepository.updateTeamWorkflow(
      user,
      teamId,
      workflowId,
      mappedData
    );

    if (!updatedWorkflow) {
      throw new BadRequestException(`Could not update Workflow with ID ${workflowId} in team ${teamId}`);
    }

    return this.toDto(updatedWorkflow);
  }

  async deleteTeamWorkflow(teamId: number, workflowId: number) {
    return await this.workflowsRepository.deleteTeamWorkflowById(teamId, workflowId);
  }

  private toDto(workflow: WorkflowType): WorkflowOutput {
    const activation: WorkflowActivationDto = {
      isActiveOnAllEventTypes: workflow.isActiveOnAll,
      activeOnEventTypeIds: workflow.activeOn?.map((relation) => relation.eventTypeId) ?? [],
    };

    const trigger: TriggerDtoType =
      workflow.trigger === BEFORE_EVENT.toUpperCase() || workflow.trigger === AFTER_EVENT.toUpperCase()
        ? {
            type: workflow.trigger.toLowerCase() as typeof BEFORE_EVENT | typeof AFTER_EVENT,
            offset: {
              value: workflow.time ?? 1,
              unit: (workflow.timeUnit?.toLowerCase() ?? HOUR) as TimeUnitType,
            },
          }
        : { type: workflow.trigger.toLowerCase() as typeof EVENT_CANCELLED };

    const steps: WorkflowStepOutputDto[] = workflow.steps.map((step) => {
      let recipient: RecipientType;
      let email = "";
      let phone = "";
      let text;
      let html;
      switch (step.action.toLowerCase() as StepAction) {
        case EMAIL_HOST:
          recipient = HOST;
          html = step.reminderBody ?? "";
          break;
        case EMAIL_ATTENDEE:
          html = step.reminderBody ?? "";
          recipient = ATTENDEE;
          break;
        case SMS_ATTENDEE:
          text = step.reminderBody ?? "";
          recipient = ATTENDEE;
          break;
        case WHATSAPP_ATTENDEE:
          text = step.reminderBody ?? "";
          recipient = ATTENDEE;
          break;
        case EMAIL_ADDRESS:
          html = step.reminderBody ?? "";
          recipient = EMAIL;
          email = step.sendTo ?? "";
          break;
        case SMS_NUMBER:
        case WHATSAPP_NUMBER:
          text = step.reminderBody ?? "";
          recipient = PHONE_NUMBER;
          phone = step.sendTo ?? "";
          break;
        default:
          recipient = ATTENDEE;
      }

      return {
        id: step.id,
        stepNumber: step.stepNumber,
        action: step.action.toLowerCase() as StepAction,
        recipient: recipient,
        email,
        phone,
        template: step.template?.toLowerCase() as TemplateType,
        includeCalendarEvent: step.includeCalendarEvent,
        sender: step.sender ?? "Default Sender",
        message: {
          subject: step.emailSubject ?? "",
          text,
          html,
        },
      };
    });

    return {
      id: workflow.id,
      name: workflow.name,
      activation: activation,
      trigger: trigger,
      steps: steps,
    };
  }

  private async mapUpdateDtoToZodUpdateSchema(
    updateDto: UpdateWorkflowDto,
    workflowIdToUse: number,
    teamId: number,
    currentData: WorkflowType
  ): Promise<TUpdateInputSchema> {
    const mappedSteps = updateDto?.steps
      ? await Promise.all(
          updateDto.steps.map(async (stepDto: UpdateWorkflowStepDto, index: number) => {
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
                  const phoneResource =
                    await this.teamsVerifiedResourcesRepository.getTeamVerifiedPhoneNumberById(
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

            const actionForZod = stepDto.action.toUpperCase() as unknown as Uppercase<StepActionsType>;
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
          })
        )
      : currentData.steps.map((step) => ({ ...step, senderName: step.sender }));

    const triggerForZod =
      (updateDto?.trigger?.type?.toUpperCase() as unknown as Uppercase<WorkflowTriggerType>) ??
      currentData.trigger;
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
      timeUnit: (timeUnitForZod?.toUpperCase() as unknown as Uppercase<TimeUnitType>) ?? null,
      isActiveOnAll: updateDto?.activation?.isActiveOnAllEventTypes ?? currentData.isActiveOnAll ?? false,
    } as const satisfies TUpdateInputSchema;

    return updateData;
  }
}
