// my-test.ts
import { test as base } from "vitest";

import { getTestEmails } from "@calcom/lib/testEmails";

export interface Fixtures {
  emails: ReturnType<typeof getEmailsFixture>;
}

export const test = base.extend<Fixtures>({
  emails: async ({}, use) => {
    await use(getEmailsFixture());
  },
});

function getEmailsFixture() {
  return {
    get: getTestEmails,
  };
}
