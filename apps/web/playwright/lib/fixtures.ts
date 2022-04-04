import { test as base } from "@playwright/test";

import { createUsersFixture } from "../fixtures/users";
import type { UsersFixture } from "../fixtures/users";

interface Fixtures {
  users: UsersFixture;
}

export const test = base.extend<Fixtures>({
  users: async ({ page }, use, testInfo) => {
    // instantiate the fixture
    const usersFixture = createUsersFixture(page);
    // use the fixture within the test
    await use(usersFixture);
  },
});
