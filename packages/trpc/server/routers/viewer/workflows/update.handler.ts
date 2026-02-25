import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import {
  isAttendeeAction,
  isEmailAction,
  isFormTrigger,
  isWhatsappAction,
} from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
import { deleteRemindersOfActiveOnIds } from "@calcom/features/ee/workflows/lib/deleteRemindersOfActiveOnIds";
import { isAuthorized } from "@calcom/features/ee/workflows/lib/isAuthorized";
import { WorkflowReminderRepository } from "@calcom/features/ee/workflows/lib/repository/workflowReminder";
import { scheduleWorkflowNotifications } from "@calcom/features/ee/workflows/lib/scheduleWorkflowNotifications";
import { verifyEmailSender } from "@calcom/features/ee/workflows/lib/verifyEmailSender";
import { WorkflowRelationsRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRelationsRepository";
import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import { WorkflowStepRepository } from "@calcom/features/ee/workflows/repositories/WorkflowStepRepository";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import tasker from "@calcom/features/tasker";
import { addPermissionsToWorkflow } from "@calcom/features/workflows/repositories/WorkflowPermissionsRepository";
import { IS_SELF_HOSTED, SCANNING_WORKFLOW_STEPS } from "@calcom/lib/constants";
import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import logger from "@calcom/lib/logger";
import { prisma, type PrismaClient } from "@calcom/prisma";
import { WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import hasActiveTeamPlanHandler from "../teams/hasActiveTeamPlan.handler";
import type { TUpdateInputSchema } from "./update.schema";
import {
  getEmailTemplateText,
  getSender,
  isAuthorizedToAddActiveOnIds,
  isStepEdited,
  removeSmsReminderFieldForEventTypes,
  upsertSmsReminderFieldForEventTypes,
} from "./util";

type UpdateOptions = {
  ctx: {
    user: Pick<
      NonNullable<TrpcSessionUser>,
      "id" | "metadata" | "locale" | "timeFormat" | "timeZone" | "organizationId"
    >;
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

    activeOnWithChildren = activeOnEventTypes.flatMap((eventType) =>
      [eventType.id].concat(eventType.children.map((child) => child.id))
    );

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

  const stepIds = userWorkflow.steps.map((step) => step.id);
  const allReminders = await WorkflowReminderRepository.findWorkflowRemindersByStepIds(stepIds);

  const remindersByStepId = new Map<number, (typeof allReminders)[number][]>();
  for (const reminder of allReminders) {
    const stepId = reminder.workflowStepId;
    if (stepId === null) continue;

    let list = remindersByStepId.get(stepId);
    if (!list) {
      list = [];
      remindersByStepId.set(stepId, list);
    }
    list.push(reminder);
  }

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

      const remindersFromStep = remindersByStepId.get(oldStep.id) || [];
      //step was deleted
      if (!newStep) {
        await WorkflowRepository.deleteAllWorkflowReminders(remindersFromStep);
        await workflowStepRepository.deleteById(oldStep.id);
      } else if (
        isStepEdited(oldStep, {
          ...newStep,
          verifiedAt: oldStep.verifiedAt,
          sourceLocale: newStep.sourceLocale ?? null,
          autoTranslateEnabled: newStep.autoTranslateEnabled ?? false,
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
        const didSubjectChange = newStep.emailSubject !== oldStep.emailSubject;
        const didSourceLocaleChange = newStep.sourceLocale !== oldStep.sourceLocale;
        const didAutoTranslateEnable = !oldStep.autoTranslateEnabled && Boolean(newStep.autoTranslateEnabled);
        const nextVerifiedAt = (() => {
          if (!SCANNING_WORKFLOW_STEPS) return new Date();
          if (didBodyChange) return null;
          return oldStep.verifiedAt;
        })();

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
          verifiedAt: nextVerifiedAt,
          autoTranslateEnabled: ctx.user.organizationId ? (newStep.autoTranslateEnabled ?? false) : false,
          sourceLocale: newStep.sourceLocale || ctx.user.locale,
        });

        const shouldTranslate =
          ctx.user.organizationId &&
          newStep.autoTranslateEnabled &&
          isAttendeeAction(newStep.action) &&
          !isWhatsappAction(newStep.action) &&
          (newStep.reminderBody || newStep.emailSubject) &&
          (didBodyChange || didSubjectChange || didSourceLocaleChange || didAutoTranslateEnable);

        if (shouldTranslate) {
          await tasker.create("translateWorkflowStepData", {
            workflowStepId: oldStep.id,
            reminderBody: newStep.reminderBody,
            emailSubject: newStep.emailSubject,
            sourceLocale: newStep.sourceLocale || ctx.user.locale,
          });
        }

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
            workflowSteps: [{ ...newStep, verifiedAt: nextVerifiedAt }],
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
          autoTranslateEnabled: ctx.user.organizationId ? (newStep.autoTranslateEnabled ?? false) : false,
          sourceLocale: newStep.sourceLocale || ctx.user.locale,
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
    }

    if (ctx.user.organizationId) {
      await Promise.all(
        createdSteps
          .filter(
            (step) =>
              step.autoTranslateEnabled &&
              isAttendeeAction(step.action) &&
              !isWhatsappAction(step.action) &&
              (step.reminderBody || step.emailSubject)
          )
          .map((step) =>
            tasker.create("translateWorkflowStepData", {
              workflowStepId: step.id,
              reminderBody: step.reminderBody,
              emailSubject: step.emailSubject,
              sourceLocale: step.sourceLocale || ctx.user.locale,
            })
          )
      );
    }

    if (!SCANNING_WORKFLOW_STEPS && !isFormTrigger(trigger)) {
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

  const workflowWithPermissions = await addPermissionsToWorkflow(workflow, ctx.user.id);
  return {
    workflow: workflowWithPermissions,
  };
};
