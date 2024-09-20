import { createOrganization } from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import type { TestFunction } from "vitest";

import { WEBSITE_URL } from "@calcom/lib/constants";
import { test } from "@calcom/web/test/fixtures/fixtures";
import type { Fixtures } from "@calcom/web/test/fixtures/fixtures";

const WEBSITE_PROTOCOL = new URL(WEBSITE_URL).protocol;
const _testWithAndWithoutOrg = (
  description: Parameters<typeof testWithAndWithoutOrg>[0],
  fn: Parameters<typeof testWithAndWithoutOrg>[1],
  timeout: Parameters<typeof testWithAndWithoutOrg>[2],
  mode: "only" | "skip" | "run" = "run"
) => {
  const t = mode === "only" ? test.only : mode === "skip" ? test.skip : test;
  t(
    `${description} - With org`,
    async ({ emails, sms, task, onTestFailed, expect, skip, onTestFinished }) => {
      const org = await createOrganization({
        name: "Test Org",
        slug: "testorg",
      });

      await fn({
        task,
        onTestFailed,
        expect,
        emails,
        sms,
        skip,
        org: {
          organization: org,
          urlOrigin: `${WEBSITE_PROTOCOL}//${org.slug}.cal.local:3000`,
        },
        onTestFinished,
      });
    },
    timeout
  );

  t(
    `${description}`,
    async ({ emails, sms, task, onTestFailed, expect, skip, onTestFinished }) => {
      await fn({
        emails,
        sms,
        task,
        onTestFailed,
        expect,
        skip,
        org: null,
        onTestFinished,
      });
    },
    timeout
  );
};

export const testWithAndWithoutOrg = (
  description: string,
  fn: TestFunction<
    Fixtures & {
      org: {
        organization: { id: number | null };
        urlOrigin?: string;
      } | null;
    }
  >,
  timeout?: number
) => {
  _testWithAndWithoutOrg(description, fn, timeout, "run");
};

testWithAndWithoutOrg.only = ((description, fn, timeout) => {
  _testWithAndWithoutOrg(description, fn, timeout, "only");
}) as typeof _testWithAndWithoutOrg;

testWithAndWithoutOrg.skip = ((description, fn, timeout) => {
  _testWithAndWithoutOrg(description, fn, timeout, "skip");
}) as typeof _testWithAndWithoutOrg;
