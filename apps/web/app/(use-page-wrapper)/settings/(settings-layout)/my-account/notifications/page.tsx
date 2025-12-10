import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getAllNotificationTypesSorted } from "@calcom/features/notifications/registry";
import { UserNotificationPreferenceRepository } from "@calcom/features/notifications/repositories/UserNotificationPreferenceRepository";
import prisma from "@calcom/prisma";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import type { NotificationPreferenceData } from "~/settings/my-account/components/NotificationPreferencesTable";
import NotificationsView from "~/settings/my-account/notifications-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("notifications"),
    (t) => t("notifications_description"),
    undefined,
    undefined,
    "/settings/my-account/notifications"
  );

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const userId = session?.user?.id;
  const redirectUrl = "/auth/login?callbackUrl=/settings/my-account/notifications";

  if (!userId) {
    return redirect(redirectUrl);
  }

  const repository = new UserNotificationPreferenceRepository({ prismaClient: prisma });
  const dbPreferences = await repository.getAllPreferences(userId);
  const notificationTypes = getAllNotificationTypesSorted();

  const preferenceMap = new Map(
    dbPreferences.map((pref) => [
      pref.notificationType,
      { emailEnabled: pref.emailEnabled, smsEnabled: pref.smsEnabled },
    ])
  );

  const preferences: NotificationPreferenceData[] = notificationTypes.map((type) => {
    const dbPref = preferenceMap.get(type.type);
    return {
      notificationType: type.type,
      emailEnabled: dbPref?.emailEnabled ?? true,
      smsEnabled: dbPref?.smsEnabled ?? true,
    };
  });

  return <NotificationsView preferences={preferences} />;
};

export default Page;
