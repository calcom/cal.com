import type { TestFunction } from "vitest";

import { WEBSITE_URL } from "@calcom/lib/constants";
import { test } from "@calcom/web/test/fixtures/fixtures";
import type { Fixtures } from "@calcom/web/test/fixtures/fixtures";
import { createOrganization } from "@calcom/web/test/utils/bookingScenario/bookingScenario";

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
    async ({ emails, sms, meta, task, onTestFailed, expect, skip }) => {
      const org = await createOrganization({
        name: "Test Org",
        slug: "testorg",
      });

      await fn({
        meta,
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
      });
    },
    timeout
  );

  t(
    `${description}`,
    async ({ emails, sms, meta, task, onTestFailed, expect, skip }) => {
      await fn({
        emails,
        sms,
        meta,
        task,
        onTestFailed,
        expect,
        skip,
        org: null,
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
