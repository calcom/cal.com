import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import { WorkflowRepository } from "@calcom/lib/server/repository/workflow";
import { prisma } from "@calcom/prisma";
import { WorkflowActions } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TDeleteInputSchema } from "./delete.schema";
import { isAuthorized, removeSmsReminderFieldForEventTypes } from "./util";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteOptions) => {
  const { id } = input;

  const workflowToDelete = await prisma.workflow.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      teamId: true,
      userId: true,
      activeOn: {
        select: {
          eventTypeId: true,
        },
      },
      activeOnTeams: {
        select: {
          teamId: true,
        },
      },
      steps: {
        select: {
          action: true,
          agent: {
            select: {
              id: true,
              outboundPhoneNumbers: {
                select: {
                  id: true,
                  phoneNumber: true,
                  subscriptionStatus: true,
                },
              },
            },
          },
        },
      },
      team: {
        select: {
          isOrganization: true,
        },
      },
    },
  });

  const isUserAuthorized = await isAuthorized(workflowToDelete, ctx.user.id, "workflow.delete");

  if (!isUserAuthorized || !workflowToDelete) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const calAISteps = workflowToDelete.steps?.filter(
    (step) => step.action === WorkflowActions.CAL_AI_PHONE_CALL
  );

  if (calAISteps && calAISteps.length > 0) {
    const aiPhoneService = createDefaultAIPhoneServiceProvider();

    for (const step of calAISteps) {
      if (step.agent?.outboundPhoneNumbers && step.agent.outboundPhoneNumbers.length > 0) {
        for (const phoneNumber of step.agent.outboundPhoneNumbers) {
          try {
            // Check subscription status and handle accordingly
            if (phoneNumber.subscriptionStatus === "ACTIVE") {
              await aiPhoneService.cancelPhoneNumberSubscription({
                phoneNumberId: phoneNumber.id,
                userId: ctx.user.id,
              });
            } else if (
              phoneNumber.subscriptionStatus === null ||
              phoneNumber.subscriptionStatus === undefined
            ) {
              await aiPhoneService.deletePhoneNumber({
                phoneNumber: phoneNumber.phoneNumber,
                userId: ctx.user.id,
                deleteFromDB: true,
              });
            }
          } catch (error) {
            console.error(`Failed to handle phone number ${phoneNumber.phoneNumber}:`, error);
          }
        }
      }

      if (step.agent) {
        try {
          await aiPhoneService.deleteAgent({
            id: step.agent.id,
            userId: ctx.user.id,
            teamId: workflowToDelete.teamId ?? undefined,
          });
        } catch (error) {
          console.error(`Failed to delete agent ${step.agent.id}:`, error);
          // Continue with deletion even if agent deletion fails
        }
      }
    }
  }

  const scheduledReminders = await prisma.workflowReminder.findMany({
    where: {
      workflowStep: {
        workflowId: id,
      },
      scheduled: true,
      NOT: {
        referenceId: null,
      },
    },
  });

  //cancel workflow reminders of deleted workflow
  await WorkflowRepository.deleteAllWorkflowReminders(scheduledReminders);

  const isOrg = workflowToDelete.team?.isOrganization ?? false;

  const activeOnToRemove = isOrg
    ? workflowToDelete.activeOnTeams.map((activeOn) => activeOn.teamId)
    : workflowToDelete.activeOn.map((activeOn) => activeOn.eventTypeId);

  await removeSmsReminderFieldForEventTypes({ activeOnToRemove, workflowId: workflowToDelete.id, isOrg });

  // automatically deletes all steps and reminders connected to this workflow
  await prisma.workflow.deleteMany({
    where: {
      id,
    },
  });

  return {
    id,
  };
};
