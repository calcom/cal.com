import type { Frame } from "@playwright/test";
import { expect } from "@playwright/test";

export async function expectHostsToBe({ hosts, frame }: { hosts: { email: string }[]; frame: Frame }) {
  try {
    await frame.waitForSelector(`[data-testid="booking-host-email"]`, { timeout: 5000 });
  } catch (error) {
    console.error("Failed to find booking-host-email element:", error.message);
    throw new Error(`booking-host-email element not found. `);
  }

  const hostEmailsOnPage = await frame.locator(`[data-testid="booking-host-email"]`).allTextContents();
  const expectedEmails = hosts.map((host) => host.email);

  expect(hostEmailsOnPage).toEqual(expect.arrayContaining(expectedEmails));
}
