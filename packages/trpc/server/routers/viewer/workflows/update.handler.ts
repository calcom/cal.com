import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import { isEmailAction, isFormTrigger } from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
import { WorkflowReminderRepository } from "@calcom/features/ee/workflows/lib/repository/workflowReminder";
import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import tasker from "@calcom/features/tasker";
import { IS_SELF_HOSTED, SCANNING_WORKFLOW_STEPS } from "@calcom/lib/constants";
import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import logger from "@calcom/lib/logger";
import { PrismaAgentRepository } from "@calcom/lib/server/repository/PrismaAgentRepository";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { addPermissionsToWorkflow } from "@calcom/lib/server/repository/workflow-permissions";
import { WorkflowRelationsRepository } from "@calcom/lib/server/repository/workflowRelations";
import { WorkflowStepRepository } from "@calcom/lib/server/repository/workflowStep";
import { prisma, type PrismaClient } from "@calcom/prisma";
import { WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import hasActiveTeamPlanHandler from "../teams/hasActiveTeamPlan.handler";
import type { TUpdateInputSchema } from "./update.schema";
import {
  getSender,
  isAuthorized,
  upsertSmsReminderFieldForEventTypes,
  deleteRemindersOfActiveOnIds,
  isAuthorizedToAddActiveOnIds,
  scheduleWorkflowNotifications,
  verifyEmailSender,
  removeSmsReminderFieldForEventTypes,
  isStepEdited,
  getEmailTemplateText,
  upsertAIAgentCallPhoneNumberFieldForEventTypes,
  removeAIAgentCallPhoneNumberFieldForEventTypes,
} from "./util";

type UpdateOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id" | "metadata" | "locale" | "timeFormat" | "timeZone">;
    prisma: PrismaClient;
  };
  input: TUpdateInputSchema;
};
const log = logger.getSubLogger({ prefix: ["[Workflows.update] "] });

export const updateHandler = async ({ ctx, input }: UpdateOptions) => {
  const { user } = ctx;
  const {
    id,
    name,
    activeOnEventTypeIds,
    activeOnRoutingFormIds,
    steps,
    trigger,
    time,
    timeUnit,
    isActiveOnAll,
  } = input;

  const userWorkflow = await WorkflowRepository.findUniqueForUpdate(id);

  const isOrg = !!userWorkflow?.team?.isOrganization;

  const isUserAuthorized = await isAuthorized(userWorkflow, ctx.user.id, "workflow.update");

  if (!isUserAuthorized || !userWorkflow) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (steps.find((step) => step.workflowId != id)) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const isCurrentUsernamePremium = hasKeyInMetadata(user, "isPremium") ? !!user.metadata.isPremium : false;

  let teamsPlan = { isActive: false, isTrial: false };
  if (!isCurrentUsernamePremium) {
    teamsPlan = await hasActiveTeamPlanHandler({ ctx, input: { ownerOnly: false } });
  }
  const hasPaidPlan = IS_SELF_HOSTED || isCurrentUsernamePremium || teamsPlan.isActive;
  let newActiveOn: number[] = [];

  let removedActiveOnIds: number[] = [];

  let activeOnWithChildren: number[] = activeOnEventTypeIds;

  let oldActiveOnIds: number[] = [];

  const workflowRelationsRepository = new WorkflowRelationsRepository(ctx.prisma);

  if (isOrg) {
    // activeOn are team ids
    if (userWorkflow.isActiveOnAll) {
      const teamRepo = new TeamRepository(ctx.prisma);
      oldActiveOnIds = (
        await teamRepo.findAllByParentId({ parentId: userWorkflow.teamId ?? 0, select: { id: true } })
      ).map((team) => team.id);
    } else {
      oldActiveOnIds = (await workflowRelationsRepository.findActiveOnTeams(id)).map(
        (teamRel) => teamRel.teamId
      );
    }

    newActiveOn = activeOnEventTypeIds.filter((teamId) => !oldActiveOnIds.includes(teamId));

    const isAuthorizedToAddIds = await isAuthorizedToAddActiveOnIds({
      newEventTypeIds: [], // No event type IDs for team workflows
      newRoutingFormIds: [], // No routing form IDs for team workflows
      newTeamIds: newActiveOn,
      teamId: userWorkflow?.teamId,
      userId: userWorkflow?.userId,
    });

    if (!isAuthorizedToAddIds) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    removedActiveOnIds = oldActiveOnIds.filter((teamId) => !activeOnEventTypeIds.includes(teamId));

    await deleteRemindersOfActiveOnIds({
      removedActiveOnIds,
      workflowSteps: userWorkflow.steps,
      isOrg,
      activeOnIds: activeOnEventTypeIds.filter((activeOn) => !newActiveOn.includes(activeOn)),
    });

    // clean up any old active on values
    await workflowRelationsRepository.deleteAllActiveOnRelations(id);

    // create all new active on relationships
    await workflowRelationsRepository.createActiveOnTeams(id, activeOnEventTypeIds);
  } else if (isFormTrigger(trigger)) {
    // activeOnRoutingFormIds are routing form ids
    const routingFormIds = activeOnRoutingFormIds;

    const isAuthorizedToAddIds = await isAuthorizedToAddActiveOnIds({
      newEventTypeIds: [], // No event type IDs for form triggers
      newRoutingFormIds: routingFormIds ?? [],
      newTeamIds: [], // No team IDs for form triggers
      teamId: userWorkflow?.teamId,
      userId: userWorkflow?.userId,
    });

    if (!isAuthorizedToAddIds) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // clean up any old active on values
    await workflowRelationsRepository.deleteAllActiveOnRelations(id);

    // Create new workflow - routing forms relationships
    await workflowRelationsRepository.createActiveOnRoutingForms(id, routingFormIds ?? []);
  } else {
    const eventTypeRepo = new EventTypeRepository(ctx.prisma);
    const activeOnEventTypes = await eventTypeRepo.findEventTypesWithoutChildren(
      activeOnEventTypeIds,
      userWorkflow.teamId
    );

    activeOnWithChildren = activeOnEventTypes
      .map((eventType) => [eventType.id].concat(eventType.children.map((child) => child.id)))
      .flat();

    let oldActiveOnEventTypes: { id: number; children: { id: number }[] }[];
    if (userWorkflow.isActiveOnAll) {
      oldActiveOnEventTypes = userWorkflow.teamId
        ? await eventTypeRepo.findAllIncludingChildrenByTeamId({
            teamId: userWorkflow.teamId,
          })
        : await eventTypeRepo.findAllIncludingChildrenByUserId({
            userId: userWorkflow.userId,
          });
    } else {
      oldActiveOnEventTypes = (await workflowRelationsRepository.findActiveOnEventTypes(id)).map(
        (eventTypeRel) => {
          return { id: eventTypeRel.eventTypeId, children: eventTypeRel.eventType.children };
        }
      );
    }

    oldActiveOnIds = oldActiveOnEventTypes.flatMap((eventType) => [
      eventType.id,
      ...eventType.children.map((child) => child.id),
    ]);

    newActiveOn = activeOnEventTypeIds.filter((eventTypeId) => !oldActiveOnIds.includes(eventTypeId));
    const isAuthorizedToAddIds = await isAuthorizedToAddActiveOnIds({
      newEventTypeIds: newActiveOn,
      newRoutingFormIds: [],
      newTeamIds: [],
      teamId: userWorkflow?.teamId,
      userId: userWorkflow?.userId,
    });

    if (!isAuthorizedToAddIds) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    //remove all scheduled Email and SMS reminders for eventTypes that are not active any more
    removedActiveOnIds = oldActiveOnIds.filter((eventTypeId) => !activeOnWithChildren.includes(eventTypeId));

    // clean up any old active on values
    await deleteRemindersOfActiveOnIds({ removedActiveOnIds, workflowSteps: userWorkflow.steps, isOrg });

    // clean up an old relationships
    await workflowRelationsRepository.deleteAllActiveOnRelations(id);

    //create all workflow - eventtypes relationships
    await workflowRelationsRepository.createActiveOnEventTypes(id, activeOnWithChildren);
  }

  if (userWorkflow.trigger !== trigger || userWorkflow.time !== time || userWorkflow.timeUnit !== timeUnit) {
    if (!isFormTrigger(userWorkflow.trigger)) {
      // Delete all existing reminders before rescheduling
      await deleteRemindersOfActiveOnIds({
        removedActiveOnIds: oldActiveOnIds,
        workflowSteps: userWorkflow.steps,
        isOrg,
      });
    }

    if (!isFormTrigger(trigger)) {
      // Schedule new reminders for all activeOn
      await scheduleWorkflowNotifications({
        activeOn: activeOnWithChildren, // schedule for activeOn that stayed the same + new active on (old reminders were deleted)
        isOrg,
        workflowSteps: userWorkflow.steps, // use old steps here, edited and deleted steps are handled below
        time,
        timeUnit,
        trigger,
        userId: user.id,
        teamId: userWorkflow.teamId,
      });
    }
  } else {
    // if trigger didn't change, only schedule reminders for all new activeOn
    await scheduleWorkflowNotifications({
      activeOn: newActiveOn,
      isOrg,
      workflowSteps: userWorkflow.steps, // use old steps here, edited and deleted steps are handled below
      time,
      timeUnit,
      trigger,
      userId: user.id,
      teamId: userWorkflow.teamId,
      alreadyScheduledActiveOnIds: activeOnEventTypeIds.filter((activeOn) => !newActiveOn.includes(activeOn)), // alreadyScheduledActiveOnIds
    });
  }

  const workflowStepRepository = new WorkflowStepRepository(ctx.prisma);

  const agentRepo = new PrismaAgentRepository(prisma);

  // handle deleted and edited workflow steps
  await Promise.all(
    userWorkflow.steps.map(async (oldStep) => {
      const foundStep = steps.find((s) => s.id === oldStep.id);
      let newStep;

      if (foundStep) {
        newStep = {
          ...foundStep,
          numberVerificationPending: false,
          sender: getSender({
            action: foundStep.action,
            sender: foundStep.sender || null,
            senderName: foundStep.senderName,
          }),
        };
      }

      const remindersFromStep = await WorkflowReminderRepository.findWorkflowRemindersByStepId(oldStep.id);
      //step was deleted
      if (!newStep) {
        if (oldStep.action === WorkflowActions.CAL_AI_PHONE_CALL && !!oldStep.agentId) {
          const agent = await agentRepo.findAgentWithPhoneNumbers(oldStep.agentId ?? undefined);

          if (!agent) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Agent ${oldStep.agentId} not found for cleanup`,
            });
          }

          await WorkflowRepository.deleteAllWorkflowReminders(remindersFromStep);
          await workflowStepRepository.deleteById(oldStep.id);

          const aiPhoneService = createDefaultAIPhoneServiceProvider();
          const externalErrors: string[] = [];

          const phoneNumberOperations: Promise<void | { success: boolean; message: string }>[] = [];

          if (agent.outboundPhoneNumbers) {
            for (const phoneNumber of agent.outboundPhoneNumbers) {
              if (phoneNumber.subscriptionStatus === PhoneNumberSubscriptionStatus.ACTIVE) {
                try {
                  phoneNumberOperations.push(
                    aiPhoneService
                      .cancelPhoneNumberSubscription({
                        phoneNumberId: phoneNumber.id,
                        userId: user.id,
                      })
                      .catch((error) => {
                        const message = `Failed to cancel phone number subscription ${
                          phoneNumber.phoneNumber
                        }: ${error instanceof Error ? error.message : "Unknown error"}`;
                        externalErrors.push(message);
                        log.error(message);
                      })
                  );
                } catch (error) {
                  const message = `Failed to cancel phone number subscription ${phoneNumber.phoneNumber}: ${
                    error instanceof Error ? error.message : "Unknown error"
                  }`;
                  externalErrors.push(message);
                  log.error(message);
                  phoneNumberOperations.push(Promise.resolve());
                }
              } else if (
                phoneNumber.subscriptionStatus === null ||
                phoneNumber.subscriptionStatus === undefined
              ) {
                try {
                  phoneNumberOperations.push(
                    aiPhoneService
                      .deletePhoneNumber({
                        phoneNumber: phoneNumber.phoneNumber,
                        userId: user.id,
                        deleteFromDB: true,
                      })
                      .catch((error) => {
                        const message = `Failed to delete phone number ${phoneNumber.phoneNumber}: ${
                          error instanceof Error ? error.message : "Unknown error"
                        }`;
                        externalErrors.push(message);
                        log.error(message);
                      })
                  );
                } catch (error) {
                  const message = `Failed to delete phone number ${phoneNumber.phoneNumber}: ${
                    error instanceof Error ? error.message : "Unknown error"
                  }`;
                  externalErrors.push(message);
                  log.error(message);
                  phoneNumberOperations.push(Promise.resolve());
                }
              }
              // Skip cancelled phone numbers - they don't need any action
            }
          }

          await Promise.all(phoneNumberOperations);

          try {
            await aiPhoneService.deleteAgent({
              id: agent.id,
              userId: user.id,
              teamId: userWorkflow.teamId ?? undefined,
            });
          } catch (error) {
            const message = `Failed to delete agent ${agent.id} from external service: ${
              error instanceof Error ? error.message : "Unknown error"
            }`;
            externalErrors.push(message);
            log.error(message);
          }

          if (oldStep.inboundAgentId) {
            try {
              await aiPhoneService.deleteAgent({
                id: oldStep.inboundAgentId,
                userId: user.id,
                teamId: userWorkflow.teamId ?? undefined,
              });
            } catch (error) {
              const message = `Failed to delete inbound agent ${
                oldStep.inboundAgentId
              } from external service: ${error instanceof Error ? error.message : "Unknown error"}`;
              externalErrors.push(message);
              log.error(message);
            }
          }

          // If there were external errors, we should log them for manual cleanup
          // but the operation is considered successful since DB is consistent
          if (externalErrors.length > 0) {
            log.error(`External service cleanup errors for workflow step ${oldStep.id}:`, externalErrors);
          }
        } else {
          // For non-AI phone steps, just delete reminders and step
          await WorkflowRepository.deleteAllWorkflowReminders(remindersFromStep);
          await workflowStepRepository.deleteById(oldStep.id);
        }
      } else if (
        isStepEdited(oldStep, {
          ...newStep,
          verifiedAt: oldStep.verifiedAt,
          agentId: newStep.agentId || null,
          inboundAgentId: newStep.inboundAgentId || null,
        })
      ) {
        // check if step that require team plan already existed before
        if (!hasPaidPlan && isEmailAction(newStep.action)) {
          const isChangingToCustomTemplate =
            newStep.template === WorkflowTemplates.CUSTOM && oldStep.template !== WorkflowTemplates.CUSTOM;

          if (isChangingToCustomTemplate) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Not available on free plan" });
          }

          //if email body or subject was changed, change to predefined template
          if (
            newStep.emailSubject !== oldStep.emailSubject ||
            newStep.reminderBody !== oldStep.reminderBody
          ) {
            // already existing custom templates can't be updated
            if (newStep.template === WorkflowTemplates.CUSTOM) {
              throw new TRPCError({ code: "UNAUTHORIZED", message: "Not available on free plan" });
            }

            // on free plans always use predefined templates
            const { emailBody, emailSubject } = await getEmailTemplateText(newStep.template, {
              locale: ctx.user.locale,
              action: newStep.action,
              timeFormat: ctx.user.timeFormat,
            });

            newStep = { ...newStep, reminderBody: emailBody, emailSubject };
          }
        }

        // update step
        const requiresSender =
          newStep.action === WorkflowActions.SMS_NUMBER ||
          newStep.action === WorkflowActions.WHATSAPP_NUMBER ||
          newStep.action === WorkflowActions.EMAIL_ADDRESS;

        if (newStep.action === WorkflowActions.EMAIL_ADDRESS) {
          await verifyEmailSender(newStep.sendTo || "", user.id, userWorkflow.teamId);
        }

        const didBodyChange = newStep.reminderBody !== oldStep.reminderBody;

        await workflowStepRepository.updateWorkflowStep(oldStep.id, {
          action: newStep.action,
          sendTo: requiresSender ? newStep.sendTo : null,
          stepNumber: newStep.stepNumber,
          reminderBody: newStep.reminderBody,
          emailSubject: newStep.emailSubject,
          template: newStep.template,
          numberRequired: newStep.numberRequired,
          sender: newStep.sender,
          numberVerificationPending: false,
          includeCalendarEvent: newStep.includeCalendarEvent,
          agentId: newStep.agentId || null,
          verifiedAt: !SCANNING_WORKFLOW_STEPS ? new Date() : didBodyChange ? null : oldStep.verifiedAt,
        });

        if (SCANNING_WORKFLOW_STEPS && didBodyChange) {
          await tasker.create("scanWorkflowBody", {
            workflowStepId: oldStep.id,
            userId: ctx.user.id,
            createdAt: new Date().toISOString(),
          });
        } else if (!isFormTrigger(trigger)) {
          // schedule notifications for edited steps (only for event-based triggers)
          await scheduleWorkflowNotifications({
            activeOn: activeOnEventTypeIds,
            isOrg,
            workflowSteps: [newStep],
            time,
            timeUnit,
            trigger,
            userId: user.id,
            teamId: userWorkflow.teamId,
          });
        }

        // cancel all notifications of edited step
        await WorkflowRepository.deleteAllWorkflowReminders(remindersFromStep);
      }
    })
  );

  // handle added workflow steps
  const addedSteps = await Promise.all(
    steps
      .filter((step) => step.id <= 0)
      .map(async (newStep) => {
        if (!hasPaidPlan && isEmailAction(newStep.action)) {
          if (newStep.template === WorkflowTemplates.CUSTOM) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Not available on free plan" });
          }
          // on free plans always use predefined templates
          const { emailBody, emailSubject } = await getEmailTemplateText(newStep.template, {
            locale: ctx.user.locale,
            action: newStep.action,
            timeFormat: ctx.user.timeFormat,
          });

          newStep = { ...newStep, reminderBody: emailBody, emailSubject };
        }

        if (newStep.action === WorkflowActions.EMAIL_ADDRESS) {
          await verifyEmailSender(newStep.sendTo || "", user.id, userWorkflow.teamId);
        }

        return {
          ...newStep,
          sender: getSender({
            action: newStep.action,
            sender: newStep.sender || null,
            senderName: newStep.senderName,
          }),
          id: undefined,
          senderName: undefined,
        };
      })
  );

  if (addedSteps.length) {
    //create new steps
    const createdSteps = await Promise.all(
      addedSteps.map((step) =>
        workflowStepRepository.createWorkflowStep({
          ...step,
          workflowId: id,
          numberVerificationPending: false,
          ...(!SCANNING_WORKFLOW_STEPS ? { verifiedAt: new Date() } : {}),
        })
      )
    );

    if (SCANNING_WORKFLOW_STEPS) {
      await Promise.all(
        createdSteps.map((step) =>
          tasker.create("scanWorkflowBody", {
            workflowStepId: step.id,
            userId: ctx.user.id,
            createdAt: new Date().toISOString(),
          })
        )
      );
    } else if (!isFormTrigger(trigger)) {
      // schedule notification for new step (only for event-based triggers)
      await scheduleWorkflowNotifications({
        activeOn: activeOnEventTypeIds,
        isOrg,
        workflowSteps: createdSteps,
        time,
        timeUnit,
        trigger,
        userId: user.id,
        teamId: userWorkflow.teamId,
      });
    }
  }

  //update trigger, name, time, timeUnit
  await WorkflowRepository.updateWorkflow(id, {
    name,
    trigger,
    time,
    timeUnit,
    isActiveOnAll,
  });

  const workflow = await WorkflowRepository.findUniqueWithRelations(id);

  if (!workflow) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Workflow not found after update",
    });
  }

  // Remove or add booking field for sms reminder number (only for event types, not routing forms)
  if (!isFormTrigger(trigger)) {
    const smsReminderNumberNeeded =
      activeOnWithChildren.length &&
      steps.some(
        (step) =>
          step.action === WorkflowActions.SMS_ATTENDEE || step.action === WorkflowActions.WHATSAPP_ATTENDEE
      );

    await removeSmsReminderFieldForEventTypes({
      activeOnToRemove: removedActiveOnIds,
      workflowId: id,
      isOrg,
      activeOn: activeOnWithChildren,
    });

    if (!smsReminderNumberNeeded) {
      await removeSmsReminderFieldForEventTypes({
        activeOnToRemove: activeOnWithChildren,
        workflowId: id,
        isOrg,
      });
    } else {
      await upsertSmsReminderFieldForEventTypes({
        activeOn: activeOnWithChildren,
        workflowId: id,
        isSmsReminderNumberRequired: steps.some(
          (s) =>
            (s.action === WorkflowActions.SMS_ATTENDEE || s.action === WorkflowActions.WHATSAPP_ATTENDEE) &&
            s.numberRequired
        ),
        isOrg,
      });
    }
  }

  // Remove or add attendeePhoneNumber field for AI phone call actions
  const aiPhoneCallStepsNeeded =
    activeOnWithChildren.length && steps.some((s) => s.action === WorkflowActions.CAL_AI_PHONE_CALL);

  await removeAIAgentCallPhoneNumberFieldForEventTypes({
    activeOnToRemove: removedActiveOnIds,
    workflowId: id,
    isOrg,
    activeOn: activeOnWithChildren,
  });

  if (!aiPhoneCallStepsNeeded) {
    await removeAIAgentCallPhoneNumberFieldForEventTypes({
      activeOnToRemove: activeOnWithChildren,
      workflowId: id,
      isOrg,
    });
  } else {
    await upsertAIAgentCallPhoneNumberFieldForEventTypes({
      activeOn: activeOnWithChildren,
      workflowId: id,
      isAIAgentCallPhoneNumberRequired: steps.some((s) => s.action === WorkflowActions.CAL_AI_PHONE_CALL),
      isOrg,
    });
  }

  const aiPhoneCallSteps = steps.filter((s) => s.action === WorkflowActions.CAL_AI_PHONE_CALL && s.agentId);
  if (aiPhoneCallSteps.length > 0) {
    const aiService = createDefaultAIPhoneServiceProvider();
    const externalToolErrors: string[] = [];

    await Promise.all(
      aiPhoneCallSteps.map(async (step) => {
        if (!step.agentId) return;

        try {
          const agent = await agentRepo.findProviderAgentIdById(step.agentId);

          if (!agent?.providerAgentId) {
            log.error(`Agent not found for step ${step.id} agentId ${step.agentId}`);
            return;
          }

          if (removedActiveOnIds.length > 0) {
            try {
              await aiService.removeToolsForEventTypes(agent.providerAgentId, removedActiveOnIds);
            } catch (error) {
              const message = `Failed to remove tools for removed event types from agent ${
                agent.providerAgentId
              }: ${error instanceof Error ? error.message : "Unknown error"}`;
              externalToolErrors.push(message);
              log.error(message);
            }
          }

          if (newActiveOn.length > 0) {
            await Promise.all(
              newActiveOn.map(async (eventTypeId) => {
                try {
                  await aiService.updateToolsFromAgentId(agent.providerAgentId, {
                    eventTypeId,
                    timeZone: user?.timeZone ?? "Europe/London",
                    userId: user.id,
                    teamId: userWorkflow.teamId || undefined,
                  });
                } catch (error) {
                  const message = `${error instanceof Error ? error.message : "Unknown error"}`;
                  externalToolErrors.push(message);
                  log.error(message);
                }
              })
            );
          }
        } catch (error) {
          const message = `Failed to update agent tools for step ${step.id}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`;
          externalToolErrors.push(message);
          log.error(message);
        }
      })
    );

    if (externalToolErrors.length > 0) {
      log.error(`Agent tool update errors for workflow ${id}:`, externalToolErrors);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: externalToolErrors.join("; "),
      });
    }
  }

  const workflowWithPermissions = await addPermissionsToWorkflow(workflow, ctx.user.id);
  return {
    workflow: workflowWithPermissions,
  };
};
