import type { Dayjs } from "@calcom/dayjs";
import { sendOrganizationAdminNoSlotsNotification } from "@calcom/emails";
import type { IRedisService } from "@calcom/features/redis/IRedisService";
import { IS_PRODUCTION, WEBAPP_URL } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";
import type { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { TeamRepository } from "@calcom/lib/server/repository/team";

type EventDetails = {
  username: string;
  eventSlug: string;
  startTime: Dayjs;
  endTime: Dayjs;
  visitorTimezone?: string;
  visitorUid?: string;
};

// Incase any updates are made - lets version the key so we can invalidate
const REDIS_KEY_VERSION = "V1";

// 7 days or 60s in dev
const NO_SLOTS_NOTIFICATION_FREQUENCY = IS_PRODUCTION ? 7 * 24 * 3600 : 60;

const NO_SLOTS_COUNT_FOR_NOTIFICATION = 2;

const constructRedisKey = (eventDetails: EventDetails, orgSlug?: string, teamId?: number) => {
  return `${REDIS_KEY_VERSION}.${eventDetails.username}:${eventDetails.eventSlug}${
    orgSlug ? `@${orgSlug}:team_${teamId}` : ""
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

export interface INoSlotsNotificationService {
  teamRepo: TeamRepository;
  membershipRepo: MembershipRepository;
  redisClient: IRedisService;
}

export class NoSlotsNotificationService {
  constructor(public readonly dependencies: INoSlotsNotificationService) {}

  async handleNotificationWhenNoSlots({
    eventDetails,
    orgDetails,
    teamId,
  }: {
    eventDetails: EventDetails;
    orgDetails: { currentOrgDomain: string | null };
    teamId?: number;
  }) {
    // Check for org
    if (!orgDetails.currentOrgDomain || !teamId) return;
    const UPSTASH_ENV_FOUND = process.env.UPSTASH_REDIS_REST_TOKEN && process.env.UPSTASH_REDIS_REST_URL;
    if (!UPSTASH_ENV_FOUND) return;

    // Check org has this setting enabled
    const orgSettings = await this.dependencies.teamRepo.findOrganizationSettingsBySlug({
      slug: orgDetails.currentOrgDomain,
    });

    if (!orgSettings?.organizationSettings?.adminGetsNoSlotsNotification) return;

    const usersUniqueKey = constructRedisKey(eventDetails, orgDetails.currentOrgDomain, teamId);
    // Get only the required amount of data so the request is as small as possible
    // We may need to get more data and check the startDate occurrence of this
    // Not trigger email if the start months are the same
    const usersExistingNoSlots =
      (await this.dependencies.redisClient.lrange(usersUniqueKey, 0, NO_SLOTS_COUNT_FOR_NOTIFICATION - 1)) ??
      [];
    await this.dependencies.redisClient.lpush(usersUniqueKey, constructDataHash(eventDetails));

    if (!usersExistingNoSlots.length) {
      await this.dependencies.redisClient.expire(usersUniqueKey, NO_SLOTS_NOTIFICATION_FREQUENCY);
    }

    // We add one as we know we just added one to the list - saves us re-fetching the data
    if (usersExistingNoSlots.length + 1 === NO_SLOTS_COUNT_FOR_NOTIFICATION) {
      // Get all team admins to send the email too
      const foundAdmins = await this.dependencies.membershipRepo.findTeamAdminsByTeamId({
        teamId,
      });

      const teamSlug = await this.dependencies.teamRepo.findTeamSlugById({
        id: teamId,
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
          startTime: eventDetails.startTime.format("YYYY-MM-DD"),
          endTime: eventDetails.endTime.format("YYYY-MM-DD"),
          // For now navigate here - when impersonation via parameter has been pushed we will impersonate and then navigate to availability
          editLink: `${WEBAPP_URL}/availability?type=team`,
          teamSlug: teamSlug?.slug ?? "",
        };

        emailsToSend.push(sendOrganizationAdminNoSlotsNotification(payload));
      }
      await Promise.all(emailsToSend);
    }
  }
}
