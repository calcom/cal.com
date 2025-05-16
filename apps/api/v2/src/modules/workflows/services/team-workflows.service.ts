import { UserWithProfile } from "@/modules/users/users.repository";
import { TeamsVerifiedResourcesRepository } from "@/modules/verified-resources/teams-verified-resources.repository";
import {
  CreateWorkflowDto,
  RecipientType,
  StepAction,
  TemplateType,
  UpdateWorkflowDto,
  UpdateWorkflowStepDto,
  WorkflowActivationDto,
  WorkflowMessageDto,
  WorkflowTimeUnit,
  WorkflowTriggerDto,
  WorkflowTriggerType,
} from "@/modules/workflows/inputs/create-workflow.input";
import { WorkflowOutput, WorkflowStepOutputDto } from "@/modules/workflows/outputs/workflow.output";
import { WorkflowsRepository, WorkflowType } from "@/modules/workflows/workflows.repository";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { TUpdateInputSchema } from "@calcom/platform-libraries/workflows";

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

    const trigger: WorkflowTriggerDto = {
      type: workflow.trigger as WorkflowTriggerType,
      offset:
        workflow.time !== null && workflow.timeUnit !== null
          ? { value: workflow.time, unit: workflow.timeUnit as WorkflowTimeUnit }
          : undefined,
    };

    const steps: WorkflowStepOutputDto[] = workflow.steps.map((step) => {
      const message: WorkflowMessageDto = {
        subject: step.emailSubject ?? "",

        text: "",
        html: "",
      };

      let recipient: RecipientType;
      let email = "";
      let phone = "";

      switch (step.action as StepAction) {
        case StepAction.EMAIL_HOST:
          recipient = RecipientType.HOST;
          message.html = step.reminderBody ?? "";
          break;
        case StepAction.EMAIL_ATTENDEE:
          message.html = step.reminderBody ?? "";
          recipient = RecipientType.ATTENDEE;
          break;
        case StepAction.SMS_ATTENDEE:
          message.text = step.reminderBody ?? "";
          recipient = RecipientType.ATTENDEE;
          break;
        case StepAction.WHATSAPP_ATTENDEE:
          message.text = step.reminderBody ?? "";

          recipient = RecipientType.ATTENDEE;
          break;
        case StepAction.EMAIL_ADDRESS:
          message.html = step.reminderBody ?? "";
          recipient = RecipientType.EMAIL;
          email = step.sendTo ?? "";
          break;
        case StepAction.SMS_NUMBER:
        case StepAction.WHATSAPP_NUMBER:
          message.text = step.reminderBody ?? "";
          recipient =
            step.action === StepAction.SMS_NUMBER ? RecipientType.PHONE_NUMBER : RecipientType.PHONE_NUMBER;
          phone = step.sendTo ?? "";
          break;
        default:
          recipient = RecipientType.ATTENDEE;
      }

      return {
        id: step.id,
        stepNumber: step.stepNumber,
        action: step.action as StepAction,
        recipient: recipient,
        email,
        phone,
        template: step.template as TemplateType,
        includeCalendarEvent: step.includeCalendarEvent,
        sender: step.sender ?? "Default Sender",
        message: message,
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

            switch (stepDto.action) {
              case StepAction.EMAIL_HOST:
              case StepAction.EMAIL_ATTENDEE:
              case StepAction.EMAIL_ADDRESS:
                reminderBody = stepDto.message.html ?? null;
                break;
              case StepAction.SMS_ATTENDEE:
              case StepAction.SMS_NUMBER:
              case StepAction.WHATSAPP_ATTENDEE:
              case StepAction.WHATSAPP_NUMBER:
                reminderBody = stepDto.message.text ?? null;
                break;
            }

            if (stepDto.action === StepAction.EMAIL_ADDRESS) {
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
            } else if (
              stepDto.action === StepAction.SMS_NUMBER ||
              stepDto.action === StepAction.WHATSAPP_NUMBER
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

            const actionForZod = stepDto.action;
            const templateForZod = stepDto.template;

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
              includeCalendarEvent: stepDto.includeCalendarEvent ?? false,
            };
          })
        )
      : currentData.steps.map((step) => ({ ...step, senderName: step.sender }));

    const triggerForZod = updateDto?.trigger?.type ?? currentData.trigger;
    const timeUnitForZod = updateDto?.trigger?.offset?.unit ?? currentData.timeUnit ?? null;

    const updateData: TUpdateInputSchema = {
      id: workflowIdToUse,
      name: updateDto.name ?? currentData.name,
      activeOn:
        updateDto?.activation?.activeOnEventTypeIds ??
        currentData?.activeOn.map((active) => active.eventTypeId) ??
        [],
      steps: mappedSteps,
      trigger: triggerForZod,
      time: updateDto?.trigger?.offset?.value ?? currentData?.time ?? null,
      timeUnit: timeUnitForZod,
      isActiveOnAll: updateDto?.activation?.isActiveOnAllEventTypes ?? currentData.isActiveOnAll ?? false,
    } as const satisfies TUpdateInputSchema;

    return updateData;
  }
}
