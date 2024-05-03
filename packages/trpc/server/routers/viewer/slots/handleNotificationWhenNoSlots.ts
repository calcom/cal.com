import type { Dayjs } from "@calcom/dayjs";
import { sendOrganizationAdminNoSlotsNotification } from "@calcom/emails";
import { RedisService } from "@calcom/features/redis/RedisService";
import { IS_PRODUCTION, WEBAPP_URL } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";

type EventDetails = {
  username: string;
  eventSlug: string;
  startTime: Dayjs;
  visitorTimezone?: string;
  visitorUid?: string;
};

// Incase any updates are made - lets version the key so we can invalidate
const REDIS_KEY_VERSION = "V1";

// 7 days or 60s in dev
const NO_SLOTS_NOTIFICATION_FREQUENCY = IS_PRODUCTION ? 7 * 24 * 3600 : 60;

const NO_SLOTS_COUNT_FOR_NOTIFICATION = 2;

const constructRedisKey = (eventDetails: EventDetails, orgSlug?: string) => {
  return `${REDIS_KEY_VERSION}.${eventDetails.username}:${eventDetails.eventSlug}${
    orgSlug ? `@${orgSlug}` : ""
  }`;
};

const constructDataHash = (eventDetails: EventDetails) => {
  const obj = {
    st: eventDetails.startTime.format("YYYY-MM-DD"),
    vTz: eventDetails?.visitorTimezone,
    vUuid: eventDetails?.visitorUid,
  };

  return JSON.stringify(obj);
};

export const handleNotificationWhenNoSlots = async ({
  eventDetails,
  orgDetails,
}: {
  eventDetails: EventDetails;
  orgDetails: { currentOrgDomain: string | null };
}) => {
  // Check for org
  if (!orgDetails.currentOrgDomain) return;
  const UPSTASH_ENV_FOUND = process.env.UPSTASH_REDIS_REST_TOKEN && process.env.UPSTASH_REDIS_REST_URL;
  if (!UPSTASH_ENV_FOUND) return;

  // Check org has this setting enabled
  const orgSettings = await prisma.team.findFirst({
    where: {
      slug: orgDetails.currentOrgDomain,
      isOrganization: true,
    },
    select: {
      organizationSettings: {
        select: {
          adminGetsNoSlotsNotification: true,
        },
      },
    },
  });

  if (!orgSettings?.organizationSettings?.adminGetsNoSlotsNotification) return;

  const redis = new RedisService();

  const usersUniqueKey = constructRedisKey(eventDetails, orgDetails.currentOrgDomain);
  // Get only the required amount of data so the request is as small as possible
  // We may need to get more data and check the startDate occurrence of this
  // Not trigger email if the start months are the same
  const usersExistingNoSlots =
    (await redis.lrange(usersUniqueKey, 0, NO_SLOTS_COUNT_FOR_NOTIFICATION - 1)) ?? [];
  await redis.lpush(usersUniqueKey, constructDataHash(eventDetails));

  if (!usersExistingNoSlots.length) {
    await redis.expire(usersUniqueKey, NO_SLOTS_NOTIFICATION_FREQUENCY);
  }

  // We add one as we know we just added one to the list - saves us re-fetching the data
  if (usersExistingNoSlots.length + 1 === NO_SLOTS_COUNT_FOR_NOTIFICATION) {
    // Get all org admins to send the email too
    const foundAdmins = await prisma.membership.findMany({
      where: {
        team: {
          slug: orgDetails.currentOrgDomain,
          isOrganization: true,
        },
        role: {
          in: ["ADMIN", "OWNER"],
        },
      },
      select: {
        user: {
          select: {
            email: true,
            locale: true,
          },
        },
      },
    });
    // TODO: use new tasker as we dont want this blocking loading slots (Just out of scope for this PR)
    // Tasker isn't 100% working with emails - will refactor after i have made changes to Tasker in another PR.
    const emailsToSend: Array<Promise<void>> = [];
    // const tasker = getTasker();
    for (const admin of foundAdmins) {
      const translation = await getTranslation(admin.user.locale ?? "en", "common");

      const payload = {
        language: translation,
        to: {
          email: admin.user.email,
        },
        user: eventDetails.username,
        slug: eventDetails.eventSlug,
        startTime: eventDetails.startTime.format("YYYY-MM"),
        // For now navigate here - when impersonation via parameter has been pushed we will impersonate and then navigate to availability
        editLink: `${WEBAPP_URL}/availability?type=team`,
      };

      emailsToSend.push(sendOrganizationAdminNoSlotsNotification(payload));
    }
    await Promise.all(emailsToSend);
  }
};
