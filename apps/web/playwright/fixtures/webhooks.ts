import { expect, type Page } from "@playwright/test";
import { createHttpServer } from "../lib/testUtils";

export function createWebhookPageFixture(page: Page) {
  return {
    createTeamReceiver: async () => {
      const webhookReceiver = createHttpServer();
      await page.goto(`/settings/developer/webhooks`);
      await page.click('[data-testid="new_webhook"]');
      await page.click('[data-testid="option-team-1"]');
      await page.waitForURL((u) => u.pathname === "/settings/developer/webhooks/new");
      const url = page.url();
      const teamId = Number(new URL(url).searchParams.get("teamId")) as number;
      await page.fill('[name="subscriberUrl"]', webhookReceiver.url);
      await page.fill('[name="secret"]', "secret");
      await expect(page.locator('[data-testid="create_webhook"]')).toBeEnabled();
      await Promise.all([
        page.click("[type=submit]"),
        page.waitForURL((url) => url.pathname.endsWith("/settings/developer/webhooks")),
      ]);
      expect(page.locator(`text='${webhookReceiver.url}'`)).toBeDefined();
      return { webhookReceiver, teamId };
    },
    createReceiver: async () => {
      const webhookReceiver = createHttpServer();
      await page.goto(`/settings/developer/webhooks`);
      await page.click('[data-testid="new_webhook"]');
      await page.fill('[name="subscriberUrl"]', webhookReceiver.url);
      await page.fill('[name="secret"]', "secret");
      await expect(page.locator('[data-testid="create_webhook"]')).toBeEnabled();
      await Promise.all([
        page.click("[type=submit]"),
        page.waitForURL((url) => url.pathname.endsWith("/settings/developer/webhooks")),
      ]);
      expect(page.locator(`text='${webhookReceiver.url}'`)).toBeDefined();
      return webhookReceiver;
    },
  };
}
