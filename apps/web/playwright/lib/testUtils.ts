import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import type { IncomingMessage, ServerResponse } from "http";
import { createServer } from "http";
import { noop } from "lodash";

import { test } from "./fixtures";

export function todo(title: string) {
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(title, noop);
}

type Request = IncomingMessage & { body?: unknown };
type RequestHandlerOptions = { req: Request; res: ServerResponse };
type RequestHandler = (opts: RequestHandlerOptions) => void;

export const testEmail = "test@example.com";
export const testName = "Test Testson";

export function createHttpServer(opts: { requestHandler?: RequestHandler } = {}) {
  const {
    requestHandler = ({ res }) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.write(JSON.stringify({}));
      res.end();
    },
  } = opts;
  const requestList: Request[] = [];
  const server = createServer((req, res) => {
    const buffer: unknown[] = [];

    req.on("data", (data) => {
      buffer.push(data);
    });
    req.on("end", () => {
      const _req: Request = req;
      // assume all incoming request bodies are json
      const json = buffer.length ? JSON.parse(buffer.join("")) : undefined;

      _req.body = json;
      requestList.push(_req);
      requestHandler({ req: _req, res });
    });
  });

  // listen on random port
  server.listen(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const port: number = (server.address() as any).port;
  const url = `http://localhost:${port}`;
  return {
    port,
    close: () => server.close(),
    requestList,
    url,
  };
}

/**
 * When in need to wait for any period of time you can use waitFor, to wait for your expectations to pass.
 */
export async function waitFor(fn: () => Promise<unknown> | unknown, opts: { timeout?: number } = {}) {
  let finished = false;
  const timeout = opts.timeout ?? 5000; // 5s
  const timeStart = Date.now();
  while (!finished) {
    try {
      await fn();
      finished = true;
    } catch {
      if (Date.now() - timeStart >= timeout) {
        throw new Error("waitFor timed out");
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
}

export async function selectFirstAvailableTimeSlotNextMonth(page: Page) {
  // Let current month dates fully render.
  // There is a bug where if we don't let current month fully render and quickly click go to next month, current month get's rendered
  // This doesn't seem to be replicable with the speed of a person, only during automation.
  // It would also allow correct snapshot to be taken for current month.
  // eslint-disable-next-line playwright/no-wait-for-timeout
  await page.waitForTimeout(1000);
  await page.click('[data-testid="incrementMonth"]');
  // @TODO: Find a better way to make test wait for full month change render to end
  // so it can click up on the right day, also when resolve remove other todos
  // Waiting for full month increment
  // eslint-disable-next-line playwright/no-wait-for-timeout
  await page.waitForTimeout(1000);
  // TODO: Find out why the first day is always booked on tests
  await page.locator('[data-testid="day"][data-disabled="false"]').nth(1).click();
  await page.locator('[data-testid="time"]').nth(0).click();
}

export async function selectSecondAvailableTimeSlotNextMonth(page: Page) {
  // Let current month dates fully render.
  // There is a bug where if we don't let current month fully render and quickly click go to next month, current month get's rendered
  // This doesn't seem to be replicable with the speed of a person, only during automation.
  // It would also allow correct snapshot to be taken for current month.
  // eslint-disable-next-line playwright/no-wait-for-timeout
  await page.waitForTimeout(1000);
  await page.click('[data-testid="incrementMonth"]');
  // @TODO: Find a better way to make test wait for full month change render to end
  // so it can click up on the right day, also when resolve remove other todos
  // Waiting for full month increment
  // eslint-disable-next-line playwright/no-wait-for-timeout
  await page.waitForTimeout(1000);
  // TODO: Find out why the first day is always booked on tests
  await page.locator('[data-testid="day"][data-disabled="false"]').nth(1).click();
  await page.locator('[data-testid="time"]').nth(1).click();
}

async function bookEventOnThisPage(page: Page) {
  await selectFirstAvailableTimeSlotNextMonth(page);
  await bookTimeSlot(page);

  // Make sure we're navigated to the success page
  await page.waitForURL((url) => {
    return url.pathname.startsWith("/booking");
  });
  await expect(page.locator("[data-testid=success-page]")).toBeVisible();
}

export async function bookOptinEvent(page: Page) {
  await page.locator('[data-testid="event-type-link"]:has-text("Opt in")').click();
  await bookEventOnThisPage(page);
}

export async function bookFirstEvent(page: Page) {
  // Click first event type
  await page.click('[data-testid="event-type-link"]');
  await bookEventOnThisPage(page);
}

export const bookTimeSlot = async (page: Page, opts?: { name?: string; email?: string }) => {
  // --- fill form
  await page.fill('[name="name"]', opts?.name ?? testName);
  await page.fill('[name="email"]', opts?.email ?? testEmail);
  await page.press('[name="email"]', "Enter");
};
// Provide an standalone localize utility not managed by next-i18n
export async function localize(locale: string) {
  const localeModule = `../../public/static/locales/${locale}/common.json`;
  const localeMap = await import(localeModule);
  return (message: string) => {
    if (message in localeMap) return localeMap[message];
    throw "No locale found for the given entry message";
  };
}

export const createNewEventType = async (page: Page, args: { eventTitle: string }) => {
  await page.click("[data-testid=new-event-type]");
  const eventTitle = args.eventTitle;
  await page.fill("[name=title]", eventTitle);
  await page.fill("[name=length]", "10");
  await page.click("[type=submit]");

  await page.waitForURL((url) => {
    return url.pathname !== "/event-types";
  });
};

export const createNewSeatedEventType = async (page: Page, args: { eventTitle: string }) => {
  const eventTitle = args.eventTitle;
  await createNewEventType(page, { eventTitle });
  await page.locator('[data-testid="vertical-tab-event_advanced_tab_title"]').click();
  await page.locator('[data-testid="offer-seats-toggle"]').click();
  await page.locator('[data-testid="update-eventtype"]').click();
};
