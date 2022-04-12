import { test as base } from "@playwright/test";

import { createUsersFixture } from "../fixtures/users";

interface Fixtures {
  users: ReturnType<typeof createUsersFixture>;
}

export const test = base.extend<Fixtures>({
  users: async ({ page }, use) => {
    const usersFixture = createUsersFixture(page);
    await use(usersFixture);
  },
});
