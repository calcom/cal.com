import { test as base } from "@playwright/test";

import { createScheduleFixture } from "../fixtures/schedule";
import type { Schedule } from "../fixtures/schedule";
import { createUsersFixture } from "../fixtures/users";

interface Fixtures {
  users: ReturnType<typeof createUsersFixture>;
  schedule: (schedule: Schedule) => ReturnType<typeof createScheduleFixture>;
}

export const test = base.extend<Fixtures>({
  users: async ({ page }, use) => {
    const usersFixture = createUsersFixture(page);
    await use(usersFixture);
  },

  schedule: async ({ page }, use) => {
    const sheduleFixture = async (schedule: Schedule) => await createScheduleFixture(schedule, page);
    await use(sheduleFixture);
  },
});
