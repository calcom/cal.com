import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { JSDOM } from "jsdom";
import type { Messages } from "mailhog";
import type { createEmailsFixture } from "playwright/fixtures/emails";

import { getEmailsReceivedByUser } from "../lib/testUtils";

export async function expectInvitationEmailToBeReceived(
  page: Page,
  emails: ReturnType<typeof createEmailsFixture>,
  userEmail: string,
  subject?: string | null,
  returnLink?: string
) {
  if (!emails) return null;

  // eslint-disable-next-line playwright/no-wait-for-timeout
  await page.waitForTimeout(2000);
  const receivedEmails = await getEmailsReceivedByUser({ emails, userEmail });
  expect(receivedEmails?.total).toBe(1);

  const [firstReceivedEmail] = (receivedEmails as Messages).items;
  if (subject) {
    expect(firstReceivedEmail.subject).toBe(subject);
  }
  if (!returnLink) return;
  const dom = new JSDOM(firstReceivedEmail.html);
  const anchor = dom.window.document.querySelector(`a[href*="${returnLink}"]`);
  return anchor?.getAttribute("href");
}

export async function expectExistingUserToBeInvitedToOrganization(
  page: Page,
  emails: ReturnType<typeof createEmailsFixture>,
  userEmail: string,
  subject?: string | null
) {
  return expectInvitationEmailToBeReceived(page, emails, userEmail, subject, "settings/team");
}
