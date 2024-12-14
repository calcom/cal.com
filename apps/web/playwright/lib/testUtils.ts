import type { Frame, Locator, Page, Request as PlaywrightRequest } from "@playwright/test";
import { expect } from "@playwright/test";
import { createHash } from "crypto";
import EventEmitter from "events";
import type { IncomingMessage, ServerResponse } from "http";
import { createServer } from "http";
// eslint-disable-next-line no-restricted-imports
import type { Messages } from "mailhog";
import { totp } from "otplib";

import type { Prisma } from "@calcom/prisma/client";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";
import type { IntervalLimit } from "@calcom/types/Calendar";

import type { createEmailsFixture } from "../fixtures/emails";
import type { Fixtures } from "./fixtures";
import { loadJSON } from "./loadJSON";

type Request = IncomingMessage & { body?: unknown };
type RequestHandlerOptions = { req: Request; res: ServerResponse };
type RequestHandler = (opts: RequestHandlerOptions) => void;

export const testEmail = "test@example.com";
export const testName = "Test Testson";

export const teamEventTitle = "Team Event - 30min";
export const teamEventSlug = "team-event-30min";

export const IS_STRIPE_ENABLED = !!(
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY &&
  process.env.STRIPE_CLIENT_ID &&
  process.env.STRIPE_PRIVATE_KEY &&
  process.env.PAYMENT_FEE_FIXED &&
  process.env.PAYMENT_FEE_PERCENTAGE
);

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
  await page.getByTestId("incrementMonth").click();

  // Waiting for full month increment
  await page.locator('[data-testid="day"][data-disabled="false"]').nth(0).click();

  await page.locator('[data-testid="time"]').nth(0).click();
}

export async function selectSecondAvailableTimeSlotNextMonth(page: Page) {
  // Let current month dates fully render.
  await page.getByTestId("incrementMonth").click();

  await page.locator('[data-testid="day"][data-disabled="false"]').nth(1).click();

  await page.locator('[data-testid="time"]').nth(0).click();
}

export async function bookEventOnThisPage(page: Page) {
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

export const bookTimeSlot = async (
  page: Page,
  opts?: { name?: string; email?: string; title?: string; attendeePhoneNumber?: string }
) => {
  // --- fill form
  await page.fill('[name="name"]', opts?.name ?? testName);
  await page.fill('[name="email"]', opts?.email ?? testEmail);
  if (opts?.title) {
    await page.fill('[name="title"]', opts.title);
  }
  if (opts?.attendeePhoneNumber) {
    await page.fill('[name="attendeePhoneNumber"]', opts.attendeePhoneNumber ?? "+918888888888");
  }
  await page.press('[name="email"]', "Enter");
};

// Provide an standalone localize utility not managed by next-i18n
export async function localize(locale: string) {
  const localeModule = `../../public/static/locales/${locale}/common.json`;
  const localeMap = loadJSON(localeModule);
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

export async function setupManagedEvent({
  users,
  unlockedFields,
}: {
  users: Fixtures["users"];
  unlockedFields?: Record<string, boolean>;
}) {
  const teamMateName = "teammate-1";
  const teamEventTitle = "Managed";
  const adminUser = await users.create(null, {
    hasTeam: true,
    teammates: [{ name: teamMateName }],
    teamEventTitle,
    teamEventSlug: "managed",
    schedulingType: "MANAGED",
    addManagedEventToTeamMates: true,
    managedEventUnlockedFields: unlockedFields,
  });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const memberUser = users.get().find((u) => u.name === teamMateName)!;
  const { team } = await adminUser.getFirstTeamMembership();
  const managedEvent = await adminUser.getFirstTeamEvent(team.id, SchedulingType.MANAGED);
  return { adminUser, memberUser, managedEvent, teamMateName, teamEventTitle, teamId: team.id };
}

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
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

export async function installAppleCalendar(page: Page) {
  await page.goto("/apps/categories/calendar");
  await page.click('[data-testid="app-store-app-card-apple-calendar"]');
  await page.waitForURL("/apps/apple-calendar");
  await page.click('[data-testid="install-app-button"]');
}

export async function getInviteLink(page: Page) {
  const json = await submitAndWaitForJsonResponse(page, "/api/trpc/teams/createInvite?batch=1", {
    action: () => page.locator(`[data-testid="copy-invite-link-button"]`).click(),
  });
  return json[0].result.data.json.inviteLink as string;
}

export async function getEmailsReceivedByUser({
  emails,
  userEmail,
}: {
  emails?: ReturnType<typeof createEmailsFixture>;
  userEmail: string;
}): Promise<Messages | null> {
  if (!emails) return null;
  const matchingEmails = await emails.search(userEmail, "to");
  if (!matchingEmails?.total) {
    console.log(
      `No emails received by ${userEmail}. All emails sent to:`,
      (await emails.messages())?.items.map((e) => e.to)
    );
  }
  return matchingEmails;
}

export async function expectEmailsToHaveSubject({
  emails,
  organizer,
  booker,
  eventTitle,
}: {
  emails?: ReturnType<typeof createEmailsFixture>;
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
    name: "Seated event user",
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
  await page.selectOption("[name=billingCountry]", "US");
  await page.fill("[name=billingPostalCode]", "12345");
  await page.click(".SubmitButton--complete-Shimmer");
}

export function goToUrlWithErrorHandling({ page, url }: { page: Page; url: string }) {
  return new Promise<{ success: boolean; url: string }>(async (resolve) => {
    const onRequestFailed = (request: PlaywrightRequest) => {
      const failedToLoadUrl = request.url();
      console.log("goToUrlWithErrorHandling: Failed to load URL:", failedToLoadUrl);
      resolve({ success: false, url: failedToLoadUrl });
    };
    page.on("requestfailed", onRequestFailed);
    try {
      await page.goto(url);
    } catch (e) {}
    page.off("requestfailed", onRequestFailed);
    resolve({ success: true, url: page.url() });
  });
}

/**
 * Within this function's callback if a non-org domain is opened, it is considered an org domain identfied from `orgSlug`
 */
export async function doOnOrgDomain(
  { orgSlug, page }: { orgSlug: string | null; page: Page },
  callback: ({
    page,
  }: {
    page: Page;
    goToUrlWithErrorHandling: (url: string) => ReturnType<typeof goToUrlWithErrorHandling>;
  }) => Promise<any>
) {
  if (!orgSlug) {
    throw new Error("orgSlug is not available");
  }

  page.setExtraHTTPHeaders({
    "x-cal-force-slug": orgSlug,
  });
  const callbackResult = await callback({
    page,
    goToUrlWithErrorHandling: (url: string) => {
      return goToUrlWithErrorHandling({ page, url });
    },
  });
  await page.setExtraHTTPHeaders({
    "x-cal-force-slug": "",
  });
  return callbackResult;
}

// When App directory is there, this is the 404 page text. We should work on fixing the 404 page as it changed due to app directory.
export const NotFoundPageTextAppDir = "This page does not exist.";
// export const NotFoundPageText = "ERROR 404";

export async function gotoFirstEventType(page: Page) {
  const $eventTypes = page.locator("[data-testid=event-types] > li a");
  const firstEventTypeElement = $eventTypes.first();
  await firstEventTypeElement.click();
  await page.waitForURL((url) => {
    return !!url.pathname.match(/\/event-types\/.+/);
  });
}

export async function gotoBookingPage(page: Page) {
  const previewLink = await page.locator("[data-testid=preview-button]").getAttribute("href");

  await page.goto(previewLink ?? "");
}

export async function saveEventType(page: Page) {
  await submitAndWaitForResponse(page, "/api/trpc/eventTypes/update?batch=1", {
    action: () => page.locator("[data-testid=update-eventtype]").click(),
  });
}

/**
 * Fastest way so far to test for saving changes and form submissions
 * @see https://playwright.dev/docs/api/class-page#page-wait-for-response
 */
export async function submitAndWaitForResponse(
  page: Page,
  url: string,
  { action = () => page.locator('[type="submit"]').click(), expectedStatusCode = 200 } = {}
) {
  const submitPromise = page.waitForResponse(url);
  await action();
  const response = await submitPromise;
  expect(response.status()).toBe(expectedStatusCode);
}
export async function submitAndWaitForJsonResponse(
  page: Page,
  url: string,
  { action = () => page.locator('[type="submit"]').click(), expectedStatusCode = 200 } = {}
) {
  const submitPromise = page.waitForResponse(url);
  await action();
  const response = await submitPromise;
  expect(response.status()).toBe(expectedStatusCode);
  return await response.json();
}

export async function confirmReschedule(page: Page, url = "/api/book/event") {
  await submitAndWaitForResponse(page, url, {
    action: () => page.locator('[data-testid="confirm-reschedule-button"]').click(),
  });
}

export async function bookTeamEvent({
  page,
  team,
  event,
  teamMatesObj,
  opts,
}: {
  page: Page;
  team: {
    slug: string | null;
    name: string | null;
  };
  event: { slug: string; title: string; schedulingType: SchedulingType | null };
  teamMatesObj?: { name: string }[];
  opts?: { attendeePhoneNumber?: string };
}) {
  // Note that even though the default way to access a team booking in an organization is to not use /team in the URL, but it isn't testable with playwright as the rewrite is taken care of by Next.js config which can't handle on the fly org slug's handling
  // So, we are using /team in the URL to access the team booking
  // There are separate tests to verify that the next.config.js rewrites are working
  // Also there are additional checkly tests that verify absolute e2e flow. They are in __checks__/organization.spec.ts
  await page.goto(`/team/${team.slug}/${event.slug}`);

  await selectFirstAvailableTimeSlotNextMonth(page);
  await bookTimeSlot(page, opts);
  await expect(page.getByTestId("success-page")).toBeVisible();

  // The title of the booking
  if (event.schedulingType === SchedulingType.ROUND_ROBIN && teamMatesObj) {
    const bookingTitle = await page.getByTestId("booking-title").textContent();

    const isMatch = teamMatesObj?.some((teamMate) => {
      const expectedTitle = `${event.title} between ${teamMate.name} and ${testName}`;
      return expectedTitle.trim() === bookingTitle?.trim();
    });

    expect(isMatch).toBe(true);
  } else {
    const BookingTitle = `${event.title} between ${team.name} and ${testName}`;
    await expect(page.getByTestId("booking-title")).toHaveText(BookingTitle);
  }
  // The booker should be in the attendee list
  await expect(page.getByTestId(`attendee-name-${testName}`)).toHaveText(testName);
}

export async function expectPageToBeNotFound({ page, url }: { page: Page; url: string }) {
  await page.goto(`${url}`);
  await expect(page.getByTestId(`404-page`)).toBeVisible();
}

export async function clickUntilDialogVisible(
  dialogOpenButton: Locator,
  visibleLocatorOnDialog: Locator,
  retries = 3,
  delay = 500
) {
  for (let i = 0; i < retries; i++) {
    await dialogOpenButton.click();
    try {
      await visibleLocatorOnDialog.waitFor({ state: "visible", timeout: delay });
      return;
    } catch {
      if (i === retries - 1) throw new Error("Dialog did not appear after multiple attempts.");
    }
  }
}
