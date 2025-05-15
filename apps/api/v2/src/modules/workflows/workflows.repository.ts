import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import { TeamsVerifiedResourcesRepository } from "@/modules/verified-resources/teams-verified-resources.repository";
import {
  WorkflowActivationDto,
  WorkflowTriggerDto,
  WorkflowTriggerType,
  WorkflowTimeUnit,
  WorkflowMessageDto,
  RecipientType,
  StepAction,
  TemplateType,
  CreateWorkflowDto,
  UpdateWorkflowDto,
  UpdateWorkflowStepDto,
} from "@/modules/workflows/inputs/create-workflow.input";
import { WorkflowOutput, WorkflowStepOutputDto } from "@/modules/workflows/outputs/workflow.output";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { TimeUnit, Workflow, WorkflowStep, WorkflowTriggerEvents } from "@prisma/client";

import { TUpdateInputSchema } from "@calcom/platform-libraries/workflows";
import { updateWorkflow } from "@calcom/platform-libraries/workflows";
import { PrismaClient } from "@calcom/prisma";

export type WorkflowType = Workflow & { activeOn: { eventTypeId: number }[]; steps: WorkflowStep[] };

@Injectable()
export class WorkflowsRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService,
    private readonly teamsVerifiedResourcesRepository: TeamsVerifiedResourcesRepository
  ) {}

  async deleteTeamWorkflowById(teamId: number, workflowId: number) {
    return await this.dbWrite.prisma.workflow.delete({ where: { id: workflowId, teamId } });
  }

  async getTeamWorkflowById(teamId: number, id: number): Promise<WorkflowType> {
    const workflow = await this.dbRead.prisma.workflow.findUnique({
      where: {
        id: id,
        teamId: teamId,
      },
      include: {
        steps: true,
        activeOn: { select: { eventTypeId: true } },
      },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found for team ${teamId}`);
    }

    return workflow;
  }

  async getTeamWorkflows(teamId: number, skip: number, take: number): Promise<WorkflowType[]> {
    const workflows = await this.dbRead.prisma.workflow.findMany({
      where: {
        teamId: teamId,
      },
      include: {
        steps: true,
        activeOn: { select: { eventTypeId: true } },
      },
      skip,
      take,
    });

    if (!workflows?.length) {
      throw new NotFoundException(`team ${teamId} does not have any Workflows.`);
    }

    return workflows;
  }

  async createTeamWorkflowHusk(teamId: number) {
    return this.dbWrite.prisma.workflow.create({
      data: {
        name: "",
        trigger: WorkflowTriggerEvents.BEFORE_EVENT,
        time: 24,
        timeUnit: TimeUnit.HOUR,
        teamId,
      },
      include: { activeOn: true, steps: true },
    });
  }

  async createTeamWorkflow(user: UserWithProfile, teamId: number, data: Partial<CreateWorkflowDto>) {
    const workflowHusk = await this.createTeamWorkflowHusk(teamId);
    await updateWorkflow({
      ctx: {
        user: { ...user, locale: user?.locale ?? "en" },
        prisma: this.dbWrite.prisma as unknown as PrismaClient,
      },
      input: await this.mapCreateDtoToZodUpdateSchema(data, workflowHusk.id, teamId, workflowHusk),
    });

    const workflow = await this.getTeamWorkflowById(teamId, workflowHusk.id);
    return workflow;
  }

  async updateTeamWorkflow(
    user: UserWithProfile,
    teamId: number,
    workflowId: number,
    data: UpdateWorkflowDto
  ) {
    const currentWorkflow = await this.getTeamWorkflowById(teamId, workflowId);
    await updateWorkflow({
      ctx: {
        user: { ...user, locale: user?.locale ?? "en" },
        prisma: this.dbWrite.prisma as unknown as PrismaClient,
      },
      input: await this.mapCreateDtoToZodUpdateSchema(data, workflowId, teamId, currentWorkflow),
    });

    const workflow = await this.getTeamWorkflowById(teamId, workflowId);
    return workflow;
  }

  public toDto(workflow: WorkflowType): WorkflowOutput {
    const activation: WorkflowActivationDto = {
      isActiveOnAll: workflow.isActiveOnAll,

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

  public async mapCreateDtoToZodUpdateSchema(
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
      isActiveOnAll: updateDto?.activation?.isActiveOnAll ?? currentData.isActiveOnAll ?? false,
    } as const satisfies TUpdateInputSchema;

    return updateData;
  }
}
