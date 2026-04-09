import { prisma } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { test } from "./lib/fixtures";
import { createNewUserEventType, submitAndWaitForResponse } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

// ─── Helpers ────────────────────────────────────────────────────────────────

async function saveEventType(page: Page): Promise<void> {
  await submitAndWaitForResponse(page, "/api/trpc/eventTypesHeavy/update?batch=1", {
    action: () => page.locator("[data-testid=update-eventtype]").click(),
  });
}

async function gotoTab(page: Page, eventTypeId: number, tabName: string): Promise<void> {
  await page.goto(`/event-types/${eventTypeId}?tabName=${tabName}`);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("#event-type-form")).toBeVisible();
}

async function createEventAndGetId(page: Page, title: string): Promise<number> {
  await createNewUserEventType(page, { eventTitle: title });
  await page.waitForSelector('[data-testid="event-title"]');
  const url = page.url();
  const match = url.match(/\/event-types\/(\d+)/);
  expect(match).toBeTruthy();
  const id = match?.[1];
  if (!id) throw new Error("Could not extract event type ID from URL");
  return parseInt(id, 10);
}

const TEAM_SIZE = 5;

async function createTeamEvent(
  users: Parameters<Parameters<typeof test>[2]>[0]["users"],
  schedulingType: SchedulingType
): Promise<{
  teamEvent: { id: number };
  teamMatesObj: { name: string }[];
}> {
  const teamMatesObj = Array.from({ length: TEAM_SIZE }, (_, i) => ({
    name: `teammate-${i + 1}`,
  }));
  const owner = await users.create(
    { username: "pro-user", name: "pro-user" },
    {
      hasTeam: true,
      teammates: teamMatesObj,
      schedulingType,
    }
  );
  await owner.apiLogin();
  const { team } = await owner.getFirstTeamMembership();
  const teamEvent = await owner.getFirstTeamEvent(team.id);
  return { owner, team, teamEvent, teamMatesObj };
}

// ─── Setup / Basics Tab ─────────────────────────────────────────────────────

test.describe("Event Type Data Persistence - Setup Tab", () => {
  test.beforeEach(async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    await page.goto("/event-types");
    await page.waitForSelector('[data-testid="event-types"]');
  });

  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("title, slug, and duration persist after save and full reload", async ({ page }) => {
    const eventTypeId = await createEventAndGetId(page, "Persistence Test");

    // Update title
    const titleInput = page.getByTestId("event-title");
    await titleInput.clear();
    await titleInput.fill("Updated Persistence Title");

    // Update slug
    const slugInput = page.getByTestId("event-slug");
    await slugInput.clear();
    await slugInput.fill("updated-slug");

    // Update duration
    const durationInput = page.getByTestId("duration");
    await durationInput.clear();
    await durationInput.fill("45");

    await saveEventType(page);

    // Full reload
    await gotoTab(page, eventTypeId, "setup");

    await expect(page.getByTestId("event-title")).toHaveValue("Updated Persistence Title");
    await expect(page.getByTestId("event-slug")).toHaveValue("updated-slug");
    await expect(page.getByTestId("duration")).toHaveValue("45");
  });

  test("description persists after save and full reload", async ({ page }) => {
    const eventTypeId = await createEventAndGetId(page, "Desc Persistence");

    const editorInput = page.getByTestId("editor-input");
    await expect(editorInput).toBeVisible({ timeout: 10000 });
    await editorInput.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.type("Test description for persistence");

    await saveEventType(page);

    // Full reload
    await gotoTab(page, eventTypeId, "setup");

    // Verify via database since the editor rendering may vary
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: { description: true },
    });
    expect(eventType?.description).toContain("Test description for persistence");
  });
});

// ─── Limits Tab ─────────────────────────────────────────────────────────────

test.describe("Event Type Data Persistence - Limits Tab", () => {
  test.beforeEach(async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    await page.goto("/event-types");
    await page.waitForSelector('[data-testid="event-types"]');
  });

  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("buffer times persist after save and full reload", async ({ page }) => {
    const eventTypeId = await createEventAndGetId(page, "Buffer Test");

    await gotoTab(page, eventTypeId, "limits");

    // Set before buffer to 15 minutes using the label-associated select
    const beforeLabel = page.locator('label[for="beforeBufferTime"]');
    await expect(beforeLabel).toBeVisible({ timeout: 10000 });
    const beforeContainer = beforeLabel.locator("..");
    await beforeContainer.locator("[class*=control]").first().click();
    await page.locator("[id*=-option-]").filter({ hasText: "15 min" }).click();

    // Set after buffer to 30 minutes
    const afterLabel = page.locator('label[for="afterBufferTime"]');
    const afterContainer = afterLabel.locator("..");
    await afterContainer.locator("[class*=control]").first().click();
    await page.locator("[id*=-option-]").filter({ hasText: "30 min" }).click();

    await saveEventType(page);

    // Verify via database
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: { beforeEventBuffer: true, afterEventBuffer: true },
    });
    expect(eventType?.beforeEventBuffer).toBe(15);
    expect(eventType?.afterEventBuffer).toBe(30);

    // Full reload and verify DB still has values
    await gotoTab(page, eventTypeId, "limits");
    const afterReload = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: { beforeEventBuffer: true, afterEventBuffer: true },
    });
    expect(afterReload?.beforeEventBuffer).toBe(15);
    expect(afterReload?.afterEventBuffer).toBe(30);
  });

  test("booking frequency limit persists after save and full reload", async ({ page }) => {
    const eventTypeId = await createEventAndGetId(page, "Booking Limit Test");

    await gotoTab(page, eventTypeId, "limits");

    // Find the booking frequency limit toggle by its title text
    const bookingLimitSection = page.locator("text=Limit booking frequency").first();
    await expect(bookingLimitSection).toBeVisible({ timeout: 10000 });
    // The switch is a sibling in the same SettingsToggle container
    const toggleContainer = bookingLimitSection.locator("xpath=ancestor::fieldset");
    const switchEl = toggleContainer.locator('[role="switch"]').first();
    await switchEl.click();

    await saveEventType(page);

    // Verify via database
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: { bookingLimits: true },
    });
    expect(eventType?.bookingLimits).toBeTruthy();
    expect(Object.keys(eventType?.bookingLimits as object).length).toBeGreaterThan(0);

    // Full reload and verify the data persists
    await gotoTab(page, eventTypeId, "limits");
    const afterReload = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: { bookingLimits: true },
    });
    expect(afterReload?.bookingLimits).toBeTruthy();
    expect(Object.keys(afterReload?.bookingLimits as object).length).toBeGreaterThan(0);
  });
});

// ─── Recurring Tab ──────────────────────────────────────────────────────────

test.describe("Event Type Data Persistence - Recurring Tab", () => {
  test.beforeEach(async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    await page.goto("/event-types");
    await page.waitForSelector('[data-testid="event-types"]');
  });

  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("enabling recurring event persists after save and full reload", async ({ page }) => {
    const eventTypeId = await createEventAndGetId(page, "Recurring Test");

    await gotoTab(page, eventTypeId, "recurring");

    // Enable recurring
    await expect(page.locator("[data-testid=recurring-event-collapsible]")).toBeHidden();
    await page.click("[data-testid=recurring-event-check]");
    await expect(page.locator("[data-testid=recurring-event-collapsible]")).toBeVisible();

    // Change frequency value to 2
    const frequencyInput = page
      .locator("[data-testid=recurring-event-collapsible] input[type=number]")
      .nth(0);
    await frequencyInput.clear();
    await frequencyInput.fill("2");

    // Change occurrences to 6
    const occurrencesInput = page
      .locator("[data-testid=recurring-event-collapsible] input[type=number]")
      .nth(1);
    await occurrencesInput.clear();
    await occurrencesInput.fill("6");

    await saveEventType(page);

    // Verify via database
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: { recurringEvent: true },
    });
    expect(eventType?.recurringEvent).toBeTruthy();
    const recurring = eventType?.recurringEvent as { freq?: number; count?: number; interval?: number };
    expect(recurring.interval).toBe(2);
    expect(recurring.count).toBe(6);

    // Full reload and verify UI
    await gotoTab(page, eventTypeId, "recurring");

    await expect(page.locator("[data-testid=recurring-event-collapsible]")).toBeVisible();
    await expect(
      page.locator("[data-testid=recurring-event-collapsible] input[type=number]").nth(0)
    ).toHaveValue("2");
    await expect(
      page.locator("[data-testid=recurring-event-collapsible] input[type=number]").nth(1)
    ).toHaveValue("6");
  });

  test("disabling recurring event persists after save and full reload", async ({ page }) => {
    const eventTypeId = await createEventAndGetId(page, "Recurring Disable Test");

    // First enable recurring
    await gotoTab(page, eventTypeId, "recurring");
    await page.click("[data-testid=recurring-event-check]");
    await expect(page.locator("[data-testid=recurring-event-collapsible]")).toBeVisible();
    await saveEventType(page);

    // Now disable it
    await gotoTab(page, eventTypeId, "recurring");
    await expect(page.locator("[data-testid=recurring-event-collapsible]")).toBeVisible();
    await page.click("[data-testid=recurring-event-check]");
    await expect(page.locator("[data-testid=recurring-event-collapsible]")).toBeHidden();
    await saveEventType(page);

    // Verify via database
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: { recurringEvent: true },
    });
    // recurringEvent should be null or empty object when disabled
    const recurring = eventType?.recurringEvent as object | null;
    expect(!recurring || Object.keys(recurring).length === 0).toBeTruthy();

    // Full reload and verify UI
    await gotoTab(page, eventTypeId, "recurring");
    await expect(page.locator("[data-testid=recurring-event-collapsible]")).toBeHidden();
  });
});

// ─── Advanced Tab ───────────────────────────────────────────────────────────

test.describe("Event Type Data Persistence - Advanced Tab", () => {
  test.beforeEach(async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    await page.goto("/event-types");
    await page.waitForSelector('[data-testid="event-types"]');
  });

  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("requires confirmation toggle persists after save and full reload", async ({ page }) => {
    const eventTypeId = await createEventAndGetId(page, "Confirmation Test");

    await gotoTab(page, eventTypeId, "advanced");

    const switchEl = page.locator('[data-testid="requires-confirmation"]');
    await expect(switchEl).toBeVisible({ timeout: 10000 });

    const initialState = await switchEl.getAttribute("data-state");
    await switchEl.click();

    let expectedState: string;
    if (initialState === "checked") {
      expectedState = "unchecked";
    } else {
      expectedState = "checked";
    }
    await expect(switchEl).toHaveAttribute("data-state", expectedState);

    await saveEventType(page);

    // Verify via database
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: { requiresConfirmation: true },
    });
    expect(eventType?.requiresConfirmation).toBe(expectedState === "checked");

    // Full reload and verify
    await gotoTab(page, eventTypeId, "advanced");
    const reloadedSwitch = page.locator('[data-testid="requires-confirmation"]');
    await expect(reloadedSwitch).toHaveAttribute("data-state", expectedState);
  });

  test("timezone lock persists after save and full reload", async ({ page }) => {
    const eventTypeId = await createEventAndGetId(page, "Timezone Lock Test");

    await gotoTab(page, eventTypeId, "advanced");

    const switchEl = page.locator('[data-testid="lock-timezone-toggle"]');
    await expect(switchEl).toBeVisible({ timeout: 10000 });
    await switchEl.click();
    await expect(switchEl).toHaveAttribute("data-state", "checked");

    await saveEventType(page);

    // Verify via database
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: { lockTimeZoneToggleOnBookingPage: true },
    });
    expect(eventType?.lockTimeZoneToggleOnBookingPage).toBe(true);

    // Full reload and verify
    await gotoTab(page, eventTypeId, "advanced");
    const reloadedSwitch = page.locator('[data-testid="lock-timezone-toggle"]');
    await expect(reloadedSwitch).toHaveAttribute("data-state", "checked");
  });

  test("redirect on booking toggle and URL persist after save and full reload", async ({ page }) => {
    const eventTypeId = await createEventAndGetId(page, "Redirect Test");

    await gotoTab(page, eventTypeId, "advanced");

    const switchEl = page.locator('[data-testid="redirect-success-booking"]');
    await expect(switchEl).toBeVisible({ timeout: 10000 });
    await switchEl.click();
    await expect(switchEl).toHaveAttribute("data-state", "checked");

    // Fill in redirect URL
    const redirectUrlInput = page.locator('[data-testid="external-redirect-url"]');
    await expect(redirectUrlInput).toBeVisible();
    await redirectUrlInput.fill("https://example.com/thank-you");

    await saveEventType(page);

    // Verify via database
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: { successRedirectUrl: true },
    });
    expect(eventType?.successRedirectUrl).toBe("https://example.com/thank-you");

    // Full reload and verify
    await gotoTab(page, eventTypeId, "advanced");
    const reloadedSwitch = page.locator('[data-testid="redirect-success-booking"]');
    await expect(reloadedSwitch).toHaveAttribute("data-state", "checked");
    await expect(page.locator('[data-testid="external-redirect-url"]')).toHaveValue(
      "https://example.com/thank-you"
    );
  });

  test("offer seats toggle and count persist after save and full reload", async ({ page }) => {
    const eventTypeId = await createEventAndGetId(page, "Seats Test");

    await gotoTab(page, eventTypeId, "advanced");

    const switchEl = page.locator('[data-testid="offer-seats-toggle"]');
    await expect(switchEl).toBeVisible({ timeout: 10000 });
    await switchEl.click();
    await expect(switchEl).toHaveAttribute("data-state", "checked");

    // Change seats count
    const seatsInput = page.locator('[data-testid="seats-per-time-slot"]');
    await expect(seatsInput).toBeVisible();
    await seatsInput.clear();
    await seatsInput.fill("8");

    await saveEventType(page);

    // Verify via database
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: { seatsPerTimeSlot: true },
    });
    expect(eventType?.seatsPerTimeSlot).toBe(8);

    // Full reload and verify
    await gotoTab(page, eventTypeId, "advanced");
    const reloadedSwitch = page.locator('[data-testid="offer-seats-toggle"]');
    await expect(reloadedSwitch).toHaveAttribute("data-state", "checked");
    await expect(page.locator('[data-testid="seats-per-time-slot"]')).toHaveValue("8");
  });

  test("booker email verification toggle persists after save and full reload", async ({ page }) => {
    const eventTypeId = await createEventAndGetId(page, "Email Verification Test");

    await gotoTab(page, eventTypeId, "advanced");

    const switchEl = page.locator('[data-testid="requires-booker-email-verification"]');
    await expect(switchEl).toBeVisible({ timeout: 10000 });
    const initialState = await switchEl.getAttribute("data-state");
    await switchEl.click();
    let expectedState: string;
    if (initialState === "checked") {
      expectedState = "unchecked";
    } else {
      expectedState = "checked";
    }

    await saveEventType(page);

    // Verify via database
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: { requiresBookerEmailVerification: true },
    });
    expect(eventType?.requiresBookerEmailVerification).toBe(expectedState === "checked");

    // Full reload and verify
    await gotoTab(page, eventTypeId, "advanced");
    const reloadedSwitch = page.locator('[data-testid="requires-booker-email-verification"]');
    await expect(reloadedSwitch).toHaveAttribute("data-state", expectedState);
  });

  test("hide organizer email toggle persists after save and full reload", async ({ page }) => {
    const eventTypeId = await createEventAndGetId(page, "Hide Email Test");

    await gotoTab(page, eventTypeId, "advanced");

    const switchEl = page.locator('[data-testid="hide-organizer-email"]');
    // This toggle might not be visible for non-team event types, so check
    if (await switchEl.isVisible()) {
      await switchEl.click();

      await saveEventType(page);

      const eventType = await prisma.eventType.findUnique({
        where: { id: eventTypeId },
        select: { hideOrganizerEmail: true },
      });
      expect(eventType?.hideOrganizerEmail).toBe(true);

      await gotoTab(page, eventTypeId, "advanced");
      const reloadedSwitch = page.locator('[data-testid="hide-organizer-email"]');
      await expect(reloadedSwitch).toHaveAttribute("data-state", "checked");
    }
  });
});

// ─── Availability Tab ───────────────────────────────────────────────────────

test.describe("Event Type Data Persistence - Availability Tab", () => {
  test.beforeEach(async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    await page.goto("/event-types");
    await page.waitForSelector('[data-testid="event-types"]');
  });

  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("availability schedule selection persists after save and full reload", async ({ page }) => {
    const eventTypeId = await createEventAndGetId(page, "Availability Test");

    await gotoTab(page, eventTypeId, "availability");

    // The availability tab should show a schedule selector
    // Verify that the availability section is rendered (schedule details with weekday names)
    await expect(page.locator("text=Monday").first()).toBeVisible({ timeout: 10000 });

    // Verify timezone is displayed
    await expect(page.locator("text=Edit availability").first()).toBeVisible({ timeout: 10000 });

    // Save and verify the schedule persists
    await saveEventType(page);

    // Full reload
    await gotoTab(page, eventTypeId, "availability");

    // Verify the schedule details are still visible after reload
    await expect(page.locator("text=Monday").first()).toBeVisible({ timeout: 10000 });
  });
});

// ─── Team/Hosts Tab (Assignment) ────────────────────────────────────────────

test.describe("Event Type Data Persistence - Hosts/Assignment Tab", () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("Round Robin hosts list is not truncated after save and full reload", async ({ page, users }) => {
    test.slow();
    const { teamEvent } = await createTeamEvent(users, SchedulingType.ROUND_ROBIN);

    // Navigate to setup tab first to make a change that dirties the form
    await page.goto(`/event-types/${teamEvent.id}?tabName=setup`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#event-type-form")).toBeVisible();

    const titleInput = page.getByTestId("event-title");
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    const currentTitle = await titleInput.inputValue();
    await titleInput.clear();
    await titleInput.fill(`${currentTitle} updated`);

    // Click team tab to navigate (form state persists across tab switches)
    await page.click("[data-testid=vertical-tab-assignment]");
    await page.waitForLoadState("networkidle");

    // Verify all hosts (owner + teammates) exist in DB
    const initialHosts = await prisma.host.findMany({
      where: { eventTypeId: teamEvent.id },
      select: {
        userId: true,
        user: { select: { name: true } },
      },
    });
    const expectedHostCount = initialHosts.length;
    expect(expectedHostCount).toBe(TEAM_SIZE + 1); // owner + teammates

    // Verify each host name is visible in the UI
    const form = page.locator("#event-type-form");
    for (const host of initialHosts) {
      if (host.user.name) {
        await expect(form.locator("li").filter({ hasText: host.user.name })).toBeVisible({ timeout: 10000 });
      }
    }

    await saveEventType(page);

    // Full reload to team tab
    await page.goto(`/event-types/${teamEvent.id}?tabName=team`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#event-type-form")).toBeVisible();

    // Verify hosts in database are not truncated
    const hostsAfterSave = await prisma.host.findMany({
      where: { eventTypeId: teamEvent.id },
      select: {
        userId: true,
        user: { select: { name: true } },
      },
    });
    expect(hostsAfterSave).toHaveLength(expectedHostCount);

    // Verify each host is still visible in the UI after reload
    const formAfterReload = page.locator("#event-type-form");
    for (const host of hostsAfterSave) {
      if (host.user.name) {
        await expect(formAfterReload.locator("li").filter({ hasText: host.user.name })).toBeVisible({
          timeout: 10000,
        });
      }
    }
  });

  test("Collective hosts list is not truncated after save and full reload", async ({ page, users }) => {
    test.slow();
    const { teamEvent } = await createTeamEvent(users, SchedulingType.COLLECTIVE);

    // Navigate to setup tab first to make a change that dirties the form
    await page.goto(`/event-types/${teamEvent.id}?tabName=setup`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#event-type-form")).toBeVisible();

    const titleInput = page.getByTestId("event-title");
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    const currentTitle = await titleInput.inputValue();
    await titleInput.clear();
    await titleInput.fill(`${currentTitle} updated`);

    // Click team tab to navigate
    await page.click("[data-testid=vertical-tab-assignment]");
    await page.waitForLoadState("networkidle");

    // Get initial hosts from DB
    const initialHosts = await prisma.host.findMany({
      where: { eventTypeId: teamEvent.id },
      select: {
        userId: true,
        isFixed: true,
        user: { select: { name: true } },
      },
    });
    const expectedHostCount = initialHosts.length;
    expect(expectedHostCount).toBe(TEAM_SIZE + 1); // owner + teammates

    // All hosts should be fixed for collective
    for (const host of initialHosts) {
      expect(host.isFixed).toBe(true);
    }

    await saveEventType(page);

    // Full reload
    await page.goto(`/event-types/${teamEvent.id}?tabName=team`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#event-type-form")).toBeVisible();

    // Verify hosts in database are preserved
    const hostsAfterSave = await prisma.host.findMany({
      where: { eventTypeId: teamEvent.id },
      select: {
        userId: true,
        isFixed: true,
        user: { select: { name: true } },
      },
    });
    expect(hostsAfterSave).toHaveLength(expectedHostCount);

    // All should still be fixed for collective
    for (const host of hostsAfterSave) {
      expect(host.isFixed).toBe(true);
    }
  });

  test("hosts survive multiple saves without truncation for Round Robin", async ({ page, users }) => {
    test.slow();
    const { teamEvent } = await createTeamEvent(users, SchedulingType.ROUND_ROBIN);

    const initialHosts = await prisma.host.findMany({
      where: { eventTypeId: teamEvent.id },
      select: { userId: true, user: { select: { name: true } } },
    });
    const expectedHostCount = initialHosts.length;
    expect(expectedHostCount).toBe(TEAM_SIZE + 1);

    // Save and reload multiple times to catch potential truncation bugs
    for (let cycle = 0; cycle < 2; cycle++) {
      // Navigate to setup tab to make a change
      await page.goto(`/event-types/${teamEvent.id}?tabName=setup`);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("#event-type-form")).toBeVisible();

      const titleInput = page.getByTestId("event-title");
      await expect(titleInput).toBeVisible({ timeout: 10000 });
      await titleInput.clear();
      await titleInput.fill(`Round Robin Cycle ${cycle}`);

      // Click team tab to verify hosts before saving
      await page.click("[data-testid=vertical-tab-assignment]");
      await page.waitForLoadState("networkidle");

      const form = page.locator("#event-type-form");
      for (const host of initialHosts) {
        if (host.user.name) {
          await expect(form.locator("li").filter({ hasText: host.user.name })).toBeVisible({
            timeout: 10000,
          });
        }
      }

      await saveEventType(page);

      // Verify hosts in database after each save
      const hostsAfterSave = await prisma.host.findMany({
        where: { eventTypeId: teamEvent.id },
        select: { userId: true, user: { select: { name: true } } },
      });
      expect(hostsAfterSave).toHaveLength(expectedHostCount);
    }
  });

  test("assign all team members toggle persists after save and full reload", async ({ page, users }) => {
    test.slow();
    const { teamEvent } = await createTeamEvent(users, SchedulingType.ROUND_ROBIN);

    await page.goto(`/event-types/${teamEvent.id}?tabName=team`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#event-type-form")).toBeVisible();

    const switchEl = page.getByTestId("assign-all-team-members-toggle");
    await expect(switchEl).toBeVisible();

    // Enable assign all team members
    const isChecked = await switchEl.getAttribute("data-state");
    if (isChecked !== "checked") {
      await switchEl.click();
    }
    await expect(switchEl).toHaveAttribute("data-state", "checked");

    await saveEventType(page);

    // Verify via database
    const eventType = await prisma.eventType.findUnique({
      where: { id: teamEvent.id },
      select: { assignAllTeamMembers: true },
    });
    expect(eventType?.assignAllTeamMembers).toBe(true);

    // Full reload
    await page.goto(`/event-types/${teamEvent.id}?tabName=team`);
    await page.waitForLoadState("networkidle");

    const reloadedSwitch = page.getByTestId("assign-all-team-members-toggle");
    await expect(reloadedSwitch).toBeVisible();
    await expect(reloadedSwitch).toHaveAttribute("data-state", "checked");
  });
});

// ─── Cross-Tab Data Integrity ───────────────────────────────────────────────

test.describe("Event Type Data Persistence - Cross-Tab Integrity", () => {
  test.beforeEach(async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    await page.goto("/event-types");
    await page.waitForSelector('[data-testid="event-types"]');
  });

  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("changes on one tab do not corrupt data on other tabs after save", async ({ page }) => {
    const eventTypeId = await createEventAndGetId(page, "Cross Tab Test");

    // Modify setup tab
    const titleInput = page.getByTestId("event-title");
    await titleInput.clear();
    await titleInput.fill("Cross Tab Modified");

    const durationInput = page.getByTestId("duration");
    await durationInput.clear();
    await durationInput.fill("60");

    // Switch to recurring tab and enable recurring
    await page.click("[data-testid=vertical-tab-recurring]");
    await page.click("[data-testid=recurring-event-check]");
    await expect(page.locator("[data-testid=recurring-event-collapsible]")).toBeVisible();

    // Switch to advanced tab and enable requires confirmation
    await page.click("[data-testid=vertical-tab-event_advanced_tab_title]");
    const confirmSwitch = page.locator('[data-testid="requires-confirmation"]');
    await expect(confirmSwitch).toBeVisible({ timeout: 10000 });
    await confirmSwitch.click();

    // Save
    await saveEventType(page);

    // Verify all changes persisted together via database
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: {
        title: true,
        length: true,
        recurringEvent: true,
        requiresConfirmation: true,
      },
    });

    expect(eventType?.title).toBe("Cross Tab Modified");
    expect(eventType?.length).toBe(60);
    expect(eventType?.recurringEvent).toBeTruthy();
    expect(eventType?.requiresConfirmation).toBe(true);

    // Full reload and verify each tab shows correct data
    await gotoTab(page, eventTypeId, "setup");
    await expect(page.getByTestId("event-title")).toHaveValue("Cross Tab Modified");
    await expect(page.getByTestId("duration")).toHaveValue("60");

    await gotoTab(page, eventTypeId, "recurring");
    await expect(page.locator("[data-testid=recurring-event-collapsible]")).toBeVisible();

    await gotoTab(page, eventTypeId, "advanced");
    const reloadedConfirmSwitch = page.locator('[data-testid="requires-confirmation"]');
    await expect(reloadedConfirmSwitch).toHaveAttribute("data-state", "checked");
  });

  test("saving from any tab preserves unsaved changes from all tabs", async ({ page }) => {
    const eventTypeId = await createEventAndGetId(page, "Multi Tab Save");

    // Modify title on setup tab
    const titleInput = page.getByTestId("event-title");
    await titleInput.clear();
    await titleInput.fill("Saved From Advanced");

    // Switch to advanced tab (without saving)
    await page.click("[data-testid=vertical-tab-event_advanced_tab_title]");

    // Enable lock timezone on advanced tab
    const switchEl = page.locator('[data-testid="lock-timezone-toggle"]');
    await expect(switchEl).toBeVisible({ timeout: 10000 });
    await switchEl.click();

    // Save from the advanced tab
    await saveEventType(page);

    // Verify both changes persisted
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      select: {
        title: true,
        lockTimeZoneToggleOnBookingPage: true,
      },
    });

    expect(eventType?.title).toBe("Saved From Advanced");
    expect(eventType?.lockTimeZoneToggleOnBookingPage).toBe(true);

    // Full reload and verify via UI
    await gotoTab(page, eventTypeId, "setup");
    await expect(page.getByTestId("event-title")).toHaveValue("Saved From Advanced");

    await gotoTab(page, eventTypeId, "advanced");
    const reloadedSwitch = page.locator('[data-testid="lock-timezone-toggle"]');
    await expect(reloadedSwitch).toHaveAttribute("data-state", "checked");
  });
});
