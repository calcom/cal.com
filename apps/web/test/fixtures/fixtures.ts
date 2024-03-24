// my-test.ts
import { test as base } from "vitest";

import tasker from "@calcom/features/tasker";
import type { Tasker } from "@calcom/features/tasker/tasker";
import { getTestEmails } from "@calcom/lib/testEmails";

export interface Fixtures {
  emails: ReturnType<typeof getEmailsFixture>;
  tasker: Tasker;
}

export const test = base.extend<Fixtures>({
  emails: async ({}, use) => {
    await use(getEmailsFixture());
  },
  tasker: async ({}, use) => {
    await use(tasker);
  },
});

function getEmailsFixture() {
  return {
    get: getTestEmails,
  };
}
