import { OrganizationSettingsRepository } from "@calcom/features/organizations/repositories/OrganizationSettingsRepository";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import prisma from "@calcom/prisma";

type OrganizationSettings = {
  disableAttendeeCalVideoRecordingEmail: boolean;
} | null;

type BookingEventTypeTeam = {
  parent: {
    organizationSettings: OrganizationSettings;
  } | null;
} | null;

type BookingEventType = {
  team: BookingEventTypeTeam;
};

type GetIsRecordingEmailDisabledInput = {
  eventType: BookingEventType | null;
  organizerUserId: number | null;
};

export const shouldSkipAttendeeRecordingEmails = ({
  eventType,
  organizerOrganizationSettings,
}: {
  eventType: BookingEventType | null;
  organizerOrganizationSettings: OrganizationSettings;
}): boolean => {
  const organizationSettings = eventType?.team
    ? eventType.team.parent?.organizationSettings ?? null
    : organizerOrganizationSettings;

  return organizationSettings?.disableAttendeeCalVideoRecordingEmail === true;
};

const organizationSettingsRepository = new OrganizationSettingsRepository(prisma);

export const getIsRecordingEmailDisabled = async ({
  eventType,
  organizerUserId,
}: GetIsRecordingEmailDisabledInput): Promise<boolean> => {
  if (eventType?.team) {
    return shouldSkipAttendeeRecordingEmails({
      eventType,
      organizerOrganizationSettings: null,
    });
  }

  if (!organizerUserId) {
    return false;
  }

  const organizationId = (
    await ProfileRepository.findFirstForUserId({
      userId: organizerUserId,
    })
  )?.organizationId;

  if (!organizationId) {
    return false;
  }

  const organizerOrganizationSettings =
    await organizationSettingsRepository.getEmailSettings(organizationId);

  return shouldSkipAttendeeRecordingEmails({
    eventType,
    organizerOrganizationSettings,
  });
};
