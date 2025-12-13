import type { Module } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";

import { KyselyCalendarCacheEventRepository } from "../../calendar-subscription/lib/cache/KyselyCalendarCacheEventRepository";
import { DI_TOKENS } from "../tokens";

export function calendarCacheEventRepositoryModuleLoader(): Module {
  return (container) => {
    container.bind(DI_TOKENS.CALENDAR_CACHE_EVENT_REPOSITORY).toValue(new KyselyCalendarCacheEventRepository(kyselyRead, kyselyWrite));
  };
}
