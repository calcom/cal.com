import type { Frame, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { createHash } from "crypto";
import EventEmitter from "events";
import type { IncomingMessage, ServerResponse } from "http";
import { createServer } from "http";
// eslint-disable-next-line no-restricted-imports
import { noop } from "lodash";
import type { API, Messages } from "mailhog";
import { totp } from "otplib";

import type { Prisma } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import type { IntervalLimit } from "@calcom/types/Calendar";

import type { Fixtures } from "./fixtures";
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

export const teamEventTitle = "Team Event - 30min";
export const teamEventSlug = "team-event-30min";

export function createHttpServer(opts: { requestHandler?: RequestHandler } = {}) {
  const {
    requestHandler = ({ res }) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.write(JSON.stringify({}));
      res.end();
    },
  } = opts;
  const eventEmitter = new EventEmitter();
  const requestList: Request[] = [];

  const waitForRequestCount = (count: number) =>
    new Promise<void>((resolve) => {
      if (requestList.length === count) {
        resolve();
        return;
      }

      const pushHandler = () => {
        if (requestList.length !== count) {
          return;
        }
        eventEmitter.off("push", pushHandler);
        resolve();
      };

      eventEmitter.on("push", pushHandler);
    });

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
      eventEmitter.emit("push");
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
    waitForRequestCount,
  };
}

export async function selectFirstAvailableTimeSlotNextMonth(page: Page | Frame) {
  // Let current month dates fully render.
  await page.click('[data-testid="incrementMonth"]');

  // Waiting for full month increment
  await page.locator('[data-testid="day"][data-disabled="false"]').nth(0).click();

  await page.locator('[data-testid="time"]').nth(0).click();
}

export async function selectSecondAvailableTimeSlotNextMonth(page: Page) {
  // Let current month dates fully render.
  await page.click('[data-testid="incrementMonth"]');

  await page.locator('[data-testid="day"][data-disabled="false"]').nth(1).click();

  await page.locator('[data-testid="time"]').nth(0).click();
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

export async function gotoRoutingLink({
  page,
  formId,
  queryString = "",
}: {
  page: Page;
  formId?: string;
  queryString?: string;
}) {
  let previewLink = null;
  if (!formId) {
    // Instead of clicking on the preview link, we are going to the preview link directly because the earlier opens a new tab which is a bit difficult to manage with Playwright
    const href = await page.locator('[data-testid="form-action-preview"]').getAttribute("href");
    if (!href) {
      throw new Error("Preview link not found");
    }
    previewLink = href;
  } else {
    previewLink = `/forms/${formId}`;
  }

  await page.goto(`${previewLink}${queryString ? `?${queryString}` : ""}`);

  // HACK: There seems to be some issue with the inputs to the form getting reset if we don't wait.
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

export async function installAppleCalendar(page: Page) {
  await page.goto("/apps/categories/calendar");
  await page.click('[data-testid="app-store-app-card-apple-calendar"]');
  await page.waitForURL("/apps/apple-calendar");
  await page.click('[data-testid="install-app-button"]');
}

export async function getInviteLink(page: Page) {
  const response = await page.waitForResponse("**/api/trpc/teams/createInvite?batch=1");
  const json = await response.json();
  return json[0].result.data.json.inviteLink as string;
}

export async function getEmailsReceivedByUser({
  emails,
  userEmail,
}: {
  emails?: API;
  userEmail: string;
}): Promise<Messages | null> {
  if (!emails) return null;
  return emails.search(userEmail, "to");
}

export async function expectEmailsToHaveSubject({
  emails,
  organizer,
  booker,
  eventTitle,
}: {
  emails?: API;
  organizer: { name?: string | null; email: string };
  booker: { name: string; email: string };
  eventTitle: string;
}) {
  if (!emails) return null;
  const emailsOrganizerReceived = await getEmailsReceivedByUser({ emails, userEmail: organizer.email });
  const emailsBookerReceived = await getEmailsReceivedByUser({ emails, userEmail: booker.email });

  expect(emailsOrganizerReceived?.total).toBe(1);
  expect(emailsBookerReceived?.total).toBe(1);

  const [organizerFirstEmail] = (emailsOrganizerReceived as Messages).items;
  const [bookerFirstEmail] = (emailsBookerReceived as Messages).items;
  const emailSubject = `${eventTitle} between ${organizer.name ?? "Nameless"} and ${booker.name}`;

  expect(organizerFirstEmail.subject).toBe(emailSubject);
  expect(bookerFirstEmail.subject).toBe(emailSubject);
}

export const createUserWithLimits = ({
  users,
  slug,
  title,
  length,
  bookingLimits,
  durationLimits,
}: {
  users: Fixtures["users"];
  slug: string;
  title?: string;
  length?: number;
  bookingLimits?: IntervalLimit;
  durationLimits?: IntervalLimit;
}) => {
  if (!bookingLimits && !durationLimits) {
    throw new Error("Need to supply at least one of bookingLimits or durationLimits");
  }

  return users.create({
    eventTypes: [
      {
        slug,
        title: title ?? slug,
        length: length ?? 30,
        bookingLimits,
        durationLimits,
      },
    ],
  });
};

// this method is not used anywhere else
// but I'm keeping it here in case we need in the future
async function createUserWithSeatedEvent(users: Fixtures["users"]) {
  const slug = "seats";
  const user = await users.create({
    eventTypes: [
      {
        title: "Seated event",
        slug,
        seatsPerTimeSlot: 10,
        requiresConfirmation: true,
        length: 30,
        disableGuests: true, // should always be true for seated events
      },
    ],
  });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const eventType = user.eventTypes.find((e) => e.slug === slug)!;
  return { user, eventType };
}

export async function createUserWithSeatedEventAndAttendees(
  fixtures: Pick<Fixtures, "users" | "bookings">,
  attendees: Prisma.AttendeeCreateManyBookingInput[]
) {
  const { user, eventType } = await createUserWithSeatedEvent(fixtures.users);

  const booking = await fixtures.bookings.create(user.id, user.username, eventType.id, {
    status: BookingStatus.ACCEPTED,
    // startTime with 1 day from now and endTime half hour after
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
    attendees: {
      createMany: {
        data: attendees,
      },
    },
  });
  return { user, eventType, booking };
}

export function generateTotpCode(email: string) {
  const secret = createHash("md5")
    .update(email + process.env.CALENDSO_ENCRYPTION_KEY)
    .digest("hex");

  totp.options = { step: 90 };
  return totp.generate(secret);
}

export async function fillStripeTestCheckout(page: Page) {
  await page.fill("[name=cardNumber]", "4242424242424242");
  await page.fill("[name=cardExpiry]", "12/30");
  await page.fill("[name=cardCvc]", "111");
  await page.fill("[name=billingName]", "Stripe Stripeson");
  await page.click(".SubmitButton--complete-Shimmer");
}

// When App directory is there, this is the 404 page text. It is commented till it's disabled
// export const NotFoundPageText = "This page could not be found";
export const NotFoundPageText = "ERROR 404";
