import GoogleCalendarService from "@calcom/app-store/googlecalendar/lib/CalendarService";
import type { TaskResult } from "@calcom/features/tasker/tasker";
import { TaskResultStatus } from "@calcom/features/tasker/tasker";
import { tasksConfig } from "@calcom/features/tasker/tasks";
import { findUniqueDelegationCalendarCredential } from "@calcom/lib/delegationCredential/server";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { CredentialForCalendarServiceWithEmail } from "@calcom/types/Credential";

import { ZDelegationCredentialSelectedCalendarsPayloadSchema } from "./schema";

const log = logger.getSubLogger({ prefix: ["[tasker] delegationCredentialSelectedCalendars"] });

export async function delegationCredentialSelectedCalendars(payload: string): Promise<TaskResult> {
  try {
    const { delegationCredentialId, lastMembershipId: lastMembershipIdFromPayload = 0 } =
      ZDelegationCredentialSelectedCalendarsPayloadSchema.parse(JSON.parse(payload));

    const lastMembershipId = lastMembershipIdFromPayload <= 0 ? 0 : lastMembershipIdFromPayload;

    const delegationCredential = await prisma.delegationCredential.findUnique({
      where: { id: delegationCredentialId },
      include: {
        organization: {
          include: {
            members: {
              select: {
                id: true,
                userId: true,
                accepted: true,
              },
              orderBy: {
                id: "asc",
              },
              where: {
                id: {
                  gt: lastMembershipId,
                },
              },
              take: tasksConfig.delegationCredentialSelectedCalendars?.take ?? 100,
            },
          },
        },
      },
    });

    if (!delegationCredential) {
      throw new Error(`DelegationCredential not found for id: ${delegationCredentialId}`);
    }

    if (!delegationCredential.enabled) {
      log.info(`DelegationCredential is disabled for id: ${delegationCredentialId}, task completed`);
      return { status: TaskResultStatus.Completed };
    }

    const { organization } = delegationCredential;
    const members = organization.members.filter((member) => member.accepted);

    if (!members.length) {
      log.debug(`No members found for delegationCredentialId: ${delegationCredentialId}, task completed`);
      // Convey that task shouldn't be considered completed
      return { status: TaskResultStatus.NoWorkToDo };
    }

    await Promise.all(
      members.map(async (member) => {
        const existingSelectedCalendar = await prisma.selectedCalendar.findFirst({
          where: {
            userId: member.userId,
            delegationCredentialId,
          },
        });
        if (existingSelectedCalendar) {
          return;
        }
        const credentialForCalendarService = await findUniqueDelegationCalendarCredential({
          userId: member.userId,
          delegationCredentialId,
        });

        if (!credentialForCalendarService) {
          log.error(
            `Credential not found for delegationCredentialId: ${delegationCredentialId} and userId: ${member.userId}`
          );
          return;
        }

        if (
          !credentialForCalendarService.delegatedTo ||
          !credentialForCalendarService.delegatedTo.serviceAccountKey ||
          !credentialForCalendarService.delegatedTo.serviceAccountKey.client_email
        ) {
          log.error(
            `Invalid delegatedTo for delegationCredentialId: ${delegationCredentialId}`,
            safeStringify({
              delegatedToSet: !!credentialForCalendarService.delegatedTo,
              serviceAccountKeySet: !!credentialForCalendarService.delegatedTo?.serviceAccountKey,
              clientEmailSet: !!credentialForCalendarService.delegatedTo?.serviceAccountKey?.client_email,
            })
          );
          return;
        }
        const googleCalendarService = new GoogleCalendarService(
          credentialForCalendarService as CredentialForCalendarServiceWithEmail
        );
        let primaryCalendar;
        try {
          primaryCalendar = await googleCalendarService.fetchPrimaryCalendar();
        } catch (error) {
          // Let one user not break the entire task of creating SelectedCalendar entries for other users
          log.error(
            `Error fetching primary calendar for delegationCredentialId: ${delegationCredentialId} and userId: ${member.userId}. Not creating SelectedCalendar`,
            safeStringify(error)
          );
          return;
        }
        if (!primaryCalendar || !primaryCalendar.id) {
          log.error(
            `Primary calendar not found for delegationCredentialId: ${delegationCredentialId} and userId: ${member.userId}. Not creating SelectedCalendar`
          );
          return;
        }
        await prisma.selectedCalendar.create({
          data: {
            // TODO: Make it configurable via task payload
            integration: "google_calendar",
            externalId: primaryCalendar.id,
            userId: member.userId,
            delegationCredentialId,
          },
        });
        log.debug(`Created SelectedCalendar for user ${member.userId}`);
      })
    );

    log.info(
      `Successfully processed delegationCredentialSelectedCalendars for credential ${delegationCredentialId}`
    );
    return {
      status: TaskResultStatus.Progressing,
      newPayload: JSON.stringify({
        delegationCredentialId,
        lastMembershipId: members[members.length - 1].id,
      }),
    };
  } catch (error) {
    log.error("Error in delegationCredentialSelectedCalendars task:", safeStringify(error));
    throw error;
  }
}
