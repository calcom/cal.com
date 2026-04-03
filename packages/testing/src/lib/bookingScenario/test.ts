import { createOrganization } from "./bookingScenario";
import { WEBSITE_URL } from "@calcom/lib/constants";
import type { Fixtures } from "../fixtures/fixtures";
import { test } from "../fixtures/fixtures";

type OrgContext = {
  org: {
    organization: { id: number | null };
    urlOrigin?: string;
    hasCustomSmtp?: boolean;
  } | null;
};

const WEBSITE_PROTOCOL = new URL(WEBSITE_URL).protocol;
const _testWithAndWithoutOrg = (
  description: string,
  fn: (context: Fixtures & OrgContext) => Promise<void> | void,
  timeout: number | undefined,
  mode: "only" | "skip" | "run" = "run"
): void => {
  const t = mode === "only" ? test.only : mode === "skip" ? test.skip : test;
  t(
    `${description} - With org`,
    async ({ emails, sms }) => {
      const org = await createOrganization({
        name: "Test Org",
        slug: "testorg",
      });

      await fn({
        emails,
        sms,
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
    async ({ emails, sms }) => {
      await fn({
        emails,
        sms,
        org: null,
      });
    },
    timeout
  );
};

type TestFunctionWithOrg = (context: Fixtures & OrgContext) => Promise<void> | void;

export const testWithAndWithoutOrg = (
  description: string,
  fn: TestFunctionWithOrg,
  timeout?: number
): void => {
  _testWithAndWithoutOrg(description, fn, timeout, "run");
};

testWithAndWithoutOrg.only = ((description: string, fn: TestFunctionWithOrg, timeout?: number): void => {
  _testWithAndWithoutOrg(description, fn, timeout, "only");
}) as typeof testWithAndWithoutOrg;

testWithAndWithoutOrg.skip = ((description: string, fn: TestFunctionWithOrg, timeout?: number): void => {
  _testWithAndWithoutOrg(description, fn, timeout, "skip");
}) as typeof testWithAndWithoutOrg;

export type SmtpTestConfig = {
  fromEmail: string;
  fromName: string;
};

const DEFAULT_SMTP_TEST_CONFIG: SmtpTestConfig = {
  fromEmail: "bookings@testorg.com",
  fromName: "TestOrg Bookings",
};

export const testWithOrgSmtpConfig = (
  description: string,
  fn: (context: Fixtures & OrgContext) => Promise<void> | void,
  smtpConfig: SmtpTestConfig = DEFAULT_SMTP_TEST_CONFIG,
  timeout?: number
): void => {
  test(
    `${description} - With org custom SMTP`,
    async ({ emails, sms }) => {
      const org = await createOrganization({
        name: "Test Org",
        slug: "testorg",
        withSmtpConfig: smtpConfig,
      });

      await fn({
        emails,
        sms,
        org: {
          organization: org,
          urlOrigin: `${WEBSITE_PROTOCOL}//${org.slug}.cal.local:3000`,
          hasCustomSmtp: true,
        },
      });
    },
    timeout
  );
};

testWithOrgSmtpConfig.only = (
  description: string,
  fn: (context: Fixtures & OrgContext) => Promise<void> | void,
  smtpConfig: SmtpTestConfig = DEFAULT_SMTP_TEST_CONFIG,
  timeout?: number
): void => {
  test.only(
    `${description} - With org custom SMTP`,
    async ({ emails, sms }) => {
      const org = await createOrganization({
        name: "Test Org",
        slug: "testorg",
        withSmtpConfig: smtpConfig,
      });

      await fn({
        emails,
        sms,
        org: {
          organization: org,
          urlOrigin: `${WEBSITE_PROTOCOL}//${org.slug}.cal.local:3000`,
          hasCustomSmtp: true,
        },
      });
    },
    timeout
  );
};

testWithOrgSmtpConfig.skip = (
  description: string,
  fn: (context: Fixtures & OrgContext) => Promise<void> | void,
  smtpConfig: SmtpTestConfig = DEFAULT_SMTP_TEST_CONFIG,
  timeout?: number
): void => {
  test.skip(
    `${description} - With org custom SMTP`,
    async ({ emails, sms }) => {
      const org = await createOrganization({
        name: "Test Org",
        slug: "testorg",
        withSmtpConfig: smtpConfig,
      });

      await fn({
        emails,
        sms,
        org: {
          organization: org,
          urlOrigin: `${WEBSITE_PROTOCOL}//${org.slug}.cal.local:3000`,
          hasCustomSmtp: true,
        },
      });
    },
    timeout
  );
};
