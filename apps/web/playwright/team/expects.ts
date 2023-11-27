import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { JSDOM } from "jsdom";
import type { API, Messages } from "mailhog";

import { getEmailsReceivedByUser } from "../lib/testUtils";

export async function expectInvitationEmailToBeReceived(
  page: Page,
  emails: API | undefined,
  userEmail: string,
  subject: string,
  returnLink?: string
) {
  if (!emails) return null;

  // eslint-disable-next-line playwright/no-wait-for-timeout
  await page.waitForTimeout(10000);
  const receivedEmails = await getEmailsReceivedByUser({ emails, userEmail });
  expect(receivedEmails?.total).toBe(1);

  const [firstReceivedEmail] = (receivedEmails as Messages).items;

  expect(firstReceivedEmail.subject).toBe(subject);
  if (!returnLink) return;
  const dom = new JSDOM(firstReceivedEmail.html);
  const anchor = dom.window.document.querySelector(`a[href*="${returnLink}"]`);
  return anchor?.getAttribute("href");
}
