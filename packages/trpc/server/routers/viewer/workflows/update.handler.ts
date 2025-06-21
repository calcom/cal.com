import { isEmailAction } from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
import tasker from "@calcom/features/tasker";
import { IS_SELF_HOSTED, SCANNING_WORKFLOW_STEPS } from "@calcom/lib/constants";
import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import { WorkflowRepository } from "@calcom/lib/server/repository/workflow";
import type { PrismaClient } from "@calcom/prisma";
import { WorkflowActions, WorkflowTemplates } from "@calcom/prisma/enums";
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
} from "./util";

type UpdateOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id" | "metadata" | "locale" | "timeFormat">;
    prisma: PrismaClient;
  };
  input: TUpdateInputSchema;
};

export const updateHandler = async ({ ctx, input }: UpdateOptions) => {
  const { user } = ctx;
  const { id, name, activeOn, steps, trigger, time, timeUnit, isActiveOnAll } = input;

  const userWorkflow = await ctx.prisma.workflow.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      userId: true,
      isActiveOnAll: true,
      trigger: true,
      time: true,
      timeUnit: true,
      team: {
        select: {
          isOrganization: true,
        },
      },
      teamId: true,
      user: {
        select: {
          teams: true,
        },
      },
      steps: true,
      activeOn: true,
      activeOnTeams: true,
    },
  });

  const isOrg = !!userWorkflow?.team?.isOrganization;

  const isUserAuthorized = await isAuthorized(userWorkflow, ctx.user.id, true);

  if (!isUserAuthorized || !userWorkflow) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (steps.find((step) => step.workflowId != id)) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const isCurrentUsernamePremium = hasKeyInMetadata(user, "isPremium") ? !!user.metadata.isPremium : false;

  let teamsPlan = { isActive: false, isTrial: false };
  if (!isCurrentUsernamePremium) {
    teamsPlan = await hasActiveTeamPlanHandler({ ctx });
  }
  const hasPaidPlan = IS_SELF_HOSTED || isCurrentUsernamePremium || teamsPlan.isActive;
  let newActiveOn: number[] = [];

  let removedActiveOnIds: number[] = [];

  let activeOnWithChildren: number[] = activeOn;

  let oldActiveOnIds: number[] = [];

  if (!isOrg) {
    // activeOn are event types ids
    const activeOnEventTypes = await ctx.prisma.eventType.findMany({
      where: {
        id: {
          in: activeOn,
        },
        ...(userWorkflow.teamId && { parentId: null }), //all children managed event types are added after
      },
      select: {
        id: true,
        children: {
          select: {
            id: true,
          },
        },
      },
    });

    activeOnWithChildren = activeOnEventTypes
      .map((eventType) => [eventType.id].concat(eventType.children.map((child) => child.id)))
      .flat();

    let oldActiveOnEventTypes: { id: number; children: { id: number }[] }[];
    if (userWorkflow.isActiveOnAll) {
      oldActiveOnEventTypes = await ctx.prisma.eventType.findMany({
        where: {
          ...(userWorkflow.teamId ? { teamId: userWorkflow.teamId } : { userId: userWorkflow.userId }),
        },
        select: {
          id: true,
          children: {
            select: {
              id: true,
            },
          },
        },
      });
    } else {
      oldActiveOnEventTypes = (
        await ctx.prisma.workflowsOnEventTypes.findMany({
          where: {
            workflowId: id,
          },
          select: {
            eventTypeId: true,
            eventType: {
              select: {
                children: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        })
      ).map((eventTypeRel) => {
        return { id: eventTypeRel.eventTypeId, children: eventTypeRel.eventType.children };
      });
    }

    oldActiveOnIds = oldActiveOnEventTypes.flatMap((eventType) => [
      eventType.id,
      ...eventType.children.map((child) => child.id),
    ]);

    newActiveOn = activeOn.filter((eventTypeId) => !oldActiveOnIds.includes(eventTypeId));

    const isAuthorizedToAddIds = await isAuthorizedToAddActiveOnIds(
      newActiveOn,
      isOrg,
      userWorkflow?.teamId,
      userWorkflow?.userId
    );

    if (!isAuthorizedToAddIds) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    //remove all scheduled Email and SMS reminders for eventTypes that are not active any more
    removedActiveOnIds = oldActiveOnIds.filter((eventTypeId) => !activeOnWithChildren.includes(eventTypeId));

    await deleteRemindersOfActiveOnIds({ removedActiveOnIds, workflowSteps: userWorkflow.steps, isOrg });

    //update active on
    await ctx.prisma.workflowsOnEventTypes.deleteMany({
      where: {
        workflowId: id,
      },
    });

    //create all workflow - eventtypes relationships
    await ctx.prisma.workflowsOnEventTypes.createMany({
      data: activeOnWithChildren.map((eventTypeId) => ({
        workflowId: id,
        eventTypeId,
      })),
    });
  } else {
    // activeOn are team ids
    if (userWorkflow.isActiveOnAll) {
      oldActiveOnIds = (
        await ctx.prisma.team.findMany({
          where: {
            parent: {
              id: userWorkflow.teamId ?? 0,
            },
          },
          select: {
            id: true,
          },
        })
      ).map((team) => team.id);
    } else {
      oldActiveOnIds = (
        await ctx.prisma.workflowsOnTeams.findMany({
          where: {
            workflowId: id,
          },
          select: {
            teamId: true,
          },
        })
      ).map((teamRel) => teamRel.teamId);
    }

    newActiveOn = activeOn.filter((teamId) => !oldActiveOnIds.includes(teamId));

    const isAuthorizedToAddIds = await isAuthorizedToAddActiveOnIds(
      newActiveOn,
      isOrg,
      userWorkflow?.teamId,
      userWorkflow?.userId
    );

    if (!isAuthorizedToAddIds) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    removedActiveOnIds = oldActiveOnIds.filter((teamId) => !activeOn.includes(teamId));

    await deleteRemindersOfActiveOnIds({
      removedActiveOnIds,
      workflowSteps: userWorkflow.steps,
      isOrg,
      activeOnIds: activeOn.filter((activeOn) => !newActiveOn.includes(activeOn)),
    });

    //update active on
    await ctx.prisma.workflowsOnTeams.deleteMany({
      where: {
        workflowId: id,
      },
    });

    await ctx.prisma.workflowsOnTeams.createMany({
      data: activeOn.map((teamId) => ({
        workflowId: id,
        teamId,
      })),
    });
  }

  if (userWorkflow.trigger !== trigger || userWorkflow.time !== time || userWorkflow.timeUnit !== timeUnit) {
    //if trigger changed, delete all reminders from steps before change
    await deleteRemindersOfActiveOnIds({
      removedActiveOnIds: oldActiveOnIds,
      workflowSteps: userWorkflow.steps,
      isOrg,
    });

    await scheduleWorkflowNotifications({
      activeOn, // schedule for activeOn that stayed the same + new active on (old reminders were deleted)
      isOrg,
      workflowSteps: userWorkflow.steps, // use old steps here, edited and deleted steps are handled below
      time,
      timeUnit,
      trigger,
      userId: user.id,
      teamId: userWorkflow.teamId,
    });
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
      alreadyScheduledActiveOnIds: activeOn.filter((activeOn) => !newActiveOn.includes(activeOn)), // alreadyScheduledActiveOnIds
    });
  }

  // handle deleted and edited workflow steps
  userWorkflow.steps.map(async (oldStep) => {
    const foundStep = steps.find((s) => s.id === oldStep.id);
    let newStep;

    if (foundStep) {
      const { senderName, ...rest } = {
        ...foundStep,
        numberVerificationPending: false,
        sender: getSender({
          action: foundStep.action,
          sender: foundStep.sender || null,
          senderName: foundStep.senderName,
        }),
      };
      newStep = rest;
    }

    const remindersFromStep = await ctx.prisma.workflowReminder.findMany({
      where: {
        workflowStepId: oldStep.id,
      },
      select: {
        id: true,
        referenceId: true,
        method: true,
        booking: {
          select: {
            eventTypeId: true,
          },
        },
      },
    });
    //step was deleted
    if (!newStep) {
      // cancel all workflow reminders from deleted steps
      await WorkflowRepository.deleteAllWorkflowReminders(remindersFromStep);

      await ctx.prisma.workflowStep.delete({
        where: {
          id: oldStep.id,
        },
      });
    } else if (isStepEdited(oldStep, { ...newStep, verifiedAt: oldStep.verifiedAt })) {
      // check if step that require team plan already existed before
      if (!hasPaidPlan && isEmailAction(newStep.action)) {
        const isChangingToCustomTemplate =
          newStep.template === WorkflowTemplates.CUSTOM && oldStep.template !== WorkflowTemplates.CUSTOM;

        if (isChangingToCustomTemplate) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Not available on free plan" });
        }

        //if email body or subject was changed, change to predefined template
        if (newStep.emailSubject !== oldStep.emailSubject || newStep.reminderBody !== oldStep.reminderBody) {
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

      await ctx.prisma.workflowStep.update({
        where: {
          id: oldStep.id,
        },
        data: {
          action: newStep.action,
          sendTo: requiresSender ? newStep.sendTo : null,
          stepNumber: newStep.stepNumber,
          workflowId: newStep.workflowId,
          reminderBody: newStep.reminderBody,
          emailSubject: newStep.emailSubject,
          template: newStep.template,
          numberRequired: newStep.numberRequired,
          sender: newStep.sender,
          numberVerificationPending: false,
          includeCalendarEvent: newStep.includeCalendarEvent,
          verifiedAt: !SCANNING_WORKFLOW_STEPS ? new Date() : didBodyChange ? null : oldStep.verifiedAt,
        },
      });

      if (SCANNING_WORKFLOW_STEPS && didBodyChange) {
        await tasker.create("scanWorkflowBody", {
          workflowStepId: oldStep.id,
          userId: ctx.user.id,
          createdAt: new Date().toISOString(),
        });
      } else {
        // schedule notifications for edited steps
        await scheduleWorkflowNotifications({
          activeOn,
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
  });

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

        const {
          id: _stepId,
          senderName,
          ...stepToAdd
        } = {
          ...newStep,
          sender: getSender({
            action: newStep.action,
            sender: newStep.sender || null,
            senderName: newStep.senderName,
          }),
        };

        return stepToAdd;
      })
  );

  if (addedSteps.length) {
    //create new steps
    const createdSteps = await Promise.all(
      addedSteps.map((step) =>
        ctx.prisma.workflowStep.create({
          data: {
            ...step,
            numberVerificationPending: false,
            ...(!SCANNING_WORKFLOW_STEPS ? { verifiedAt: new Date() } : {}),
          },
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
    } else {
      // schedule notification for new step
      await scheduleWorkflowNotifications({
        activeOn,
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
  await ctx.prisma.workflow.update({
    where: {
      id,
    },
    data: {
      name,
      trigger,
      time,
      timeUnit,
      isActiveOnAll,
    },
  });

  const workflow = await ctx.prisma.workflow.findUnique({
    where: {
      id,
    },
    include: {
      activeOn: {
        select: {
          eventType: true,
        },
      },
      activeOnTeams: {
        select: {
          team: true,
        },
      },
      team: {
        select: {
          id: true,
          slug: true,
          members: true,
          name: true,
          isOrganization: true,
        },
      },
      steps: {
        orderBy: {
          stepNumber: "asc",
        },
      },
    },
  });

  // Remove or add booking field for sms reminder number
  const smsReminderNumberNeeded =
    activeOn.length &&
    steps.some(
      (step) =>
        step.action === WorkflowActions.SMS_ATTENDEE || step.action === WorkflowActions.WHATSAPP_ATTENDEE
    );
  await removeSmsReminderFieldForEventTypes({
    activeOnToRemove: removedActiveOnIds,
    workflowId: id,
    isOrg,
    activeOn,
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

  return {
    workflow,
  };
};
