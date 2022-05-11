import { expect, Page, test } from "@playwright/test";
import { createServer, IncomingMessage, ServerResponse } from "http";

export function todo(title: string) {
  test.skip(title, () => {});
}

type Request = IncomingMessage & { body?: unknown };
type RequestHandlerOptions = { req: Request; res: ServerResponse };
type RequestHandler = (opts: RequestHandlerOptions) => void;

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
  await page.click('[data-testid="incrementMonth"]');
  // @TODO: Find a better way to make test wait for full month change render to end
  // so it can click up on the right day, also when resolve remove other todos
  // Waiting for full month increment
  await page.waitForTimeout(1000);
  // TODO: Find out why the first day is always booked on tests
  await page.locator('[data-testid="day"][data-disabled="false"]').nth(1).click();
  await page.locator('[data-testid="time"]').nth(0).click();
}

export async function selectSecondAvailableTimeSlotNextMonth(page: Page) {
  await page.click('[data-testid="incrementMonth"]');
  // @TODO: Find a better way to make test wait for full month change render to end
  // so it can click up on the right day, also when resolve remove other todos
  // Waiting for full month increment
  await page.waitForTimeout(1000);
  // TODO: Find out why the first day is always booked on tests
  await page.locator('[data-testid="day"][data-disabled="false"]').nth(1).click();
  await page.locator('[data-testid="time"]').nth(1).click();
}

export async function bookFirstEvent(page: Page) {
  // Click first event type
  await page.click('[data-testid="event-type-link"]');
  await selectFirstAvailableTimeSlotNextMonth(page);
  await bookTimeSlot(page);

  // Make sure we're navigated to the success page
  await expect(page.locator("[data-testid=success-page]")).toBeVisible();
}

export const bookTimeSlot = async (page: Page) => {
  // --- fill form
  await page.fill('[name="name"]', "Test Testson");
  await page.fill('[name="email"]', "test@example.com");
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
