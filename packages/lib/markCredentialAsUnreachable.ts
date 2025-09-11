import { sendUnreachableCalendarEmail } from "@calcom/emails/email-manager";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import prisma from "@calcom/prisma";

const NOTIFICATION_COOLDOWN_HOURS = 24; // Only notify once per day

/**
 * Marks a credential as unreachable and optionally sends a notification email
 * @param credentialId - ID of the credential that is unreachable
 * @param error - Optional error message for logging
 */
export async function markCredentialAsUnreachable(credentialId: number, error?: string) {
  try {
    // Get the credential with user information
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            notifyCalendarAlerts: true,
          },
        },
        app: {
          select: {
            slug: true,
            dirName: true,
          },
        },
      },
    });

    if (!credential || !credential.user) {
      console.warn(`Credential ${credentialId} not found or has no associated user`);
      return;
    }

    const now = new Date();
    const shouldNotify = shouldSendNotification(
      credential.lastNotified,
      credential.user.notifyCalendarAlerts ?? true
    );

    // Update the credential status
    await CredentialRepository.updateReachabilityById({
      id: credentialId,
      isUnreachable: true,
      lastNotified: shouldNotify ? now : credential.lastNotified,
    });

    // Send notification email if appropriate
    if (shouldNotify && credential.user.email) {
      await sendUnreachableCalendarEmail({
        recipientEmail: credential.user.email,
        recipientName: credential.user.name || "there",
        calendarName: credential.app?.slug || credential.app?.dirName || "calendar",
        reason: error || "Calendar connection issue detected",
      });

      console.log(
        `Sent unreachable calendar notification to ${credential.user.email} for credential ${credentialId}`
      );
    }

    console.log(`Marked credential ${credentialId} as unreachable`, error ? `Error: ${error}` : "");
  } catch (err) {
    console.error(`Failed to mark credential ${credentialId} as unreachable:`, err);
  }
}

/**
 * Marks a credential as reachable (clears the unreachable flag)
 * @param credentialId - ID of the credential that is now reachable
 */
export async function markCredentialAsReachable(credentialId: number) {
  try {
    await CredentialRepository.updateReachabilityById({
      id: credentialId,
      isUnreachable: false,
    });

    console.log(`Marked credential ${credentialId} as reachable`);
  } catch (err) {
    console.error(`Failed to mark credential ${credentialId} as reachable:`, err);
  }
}

/**
 * Determines if a notification should be sent based on user preferences and cooldown period
 */
function shouldSendNotification(lastNotified: Date | null, userWantsNotifications: boolean): boolean {
  // Don't send if user has disabled notifications
  if (!userWantsNotifications) {
    return false;
  }

  // If never notified before, send notification
  if (!lastNotified) {
    return true;
  }

  // Check if cooldown period has passed
  const timeSinceLastNotification = Date.now() - lastNotified.getTime();
  const cooldownPeriod = NOTIFICATION_COOLDOWN_HOURS * 60 * 60 * 1000; // Convert to milliseconds

  return timeSinceLastNotification >= cooldownPeriod;
}
