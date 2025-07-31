import { CalendarCacheService } from "@calcom/features/calendar-cache-sql/CalendarCacheService";
import { CalendarEventRepository } from "@calcom/features/calendar-cache-sql/CalendarEventRepository";
import { CalendarSubscriptionRepository } from "@calcom/features/calendar-cache-sql/CalendarSubscriptionRepository";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { Calendar, CalendarClass } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

import appStore from "..";

interface CalendarApp {
  lib: {
    CalendarService: CalendarClass;
  };
}

const log = logger.getSubLogger({ prefix: ["CalendarManager"] });

/**
 * @see [Using type predicates](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)
 */
const isCalendarService = (x: unknown): x is CalendarApp =>
  !!x &&
  typeof x === "object" &&
  "lib" in x &&
  typeof x.lib === "object" &&
  !!x.lib &&
  "CalendarService" in x.lib;

export const getCalendar = async (
  credential: CredentialForCalendarService | null
): Promise<Calendar | null> => {
  if (!credential || !credential.key) return null;
  let { type: calendarType } = credential;
  if (calendarType?.endsWith("_other_calendar")) {
    calendarType = calendarType.split("_other_calendar")[0];
  }
  // Backwards compatibility until CRM manager is created
  if (calendarType?.endsWith("_crm")) {
    calendarType = calendarType.split("_crm")[0];
  }

  const calendarAppImportFn = appStore[calendarType.split("_").join("") as keyof typeof appStore];

  if (!calendarAppImportFn) {
    log.warn(`calendar of type ${calendarType} is not implemented`);
    return null;
  }

  const calendarApp = await calendarAppImportFn();

  if (!isCalendarService(calendarApp)) {
    log.warn(`calendar of type ${calendarType} is not implemented`);
    return null;
  }
  const CalendarService = calendarApp.lib.CalendarService;
  return new CalendarService(credential);
};

/**
 * Helper function to get the appropriate calendar service based on feature flag and subscription availability
 */
export const getCalendarService = async (
  credential: CredentialForCalendarService | null
): Promise<Calendar | null> => {
  if (!credential || !credential.key) return null;

  // Only Google Calendar supports CalendarCacheService
  if (credential.type !== "google_calendar") {
    log.debug(`Using regular CalendarService for credential ${credential.id} (not Google Calendar)`);
    return await getCalendar(credential);
  }

  try {
    const featuresRepo = new FeaturesRepository();
    const isSqlReadEnabled = await featuresRepo.checkIfFeatureIsEnabledGlobally("calendar-cache-sql-read");

    if (!isSqlReadEnabled) {
      return await getCalendar(credential);
    }

    // Check if this credential has any subscriptions
    const subscriptionRepo = new CalendarSubscriptionRepository(prisma);

    const subscription = await subscriptionRepo.findByCredentialId(credential.id);
    if (!subscription) {
      log.debug(`Using regular CalendarService for credential ${credential.id} (no subscriptions found)`);
      return await getCalendar(credential);
    }

    const eventRepo = new CalendarEventRepository(prisma);
    log.debug(`Using CalendarCacheService for credential ${credential.id}`);
    return new CalendarCacheService(credential, subscriptionRepo, eventRepo);
  } catch (error) {
    log.warn(
      `Error determining calendar service for credential ${credential.id}, falling back to regular service:`,
      error
    );
    return await getCalendar(credential);
  }
};
