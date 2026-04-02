import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { test } from "./lib/fixtures";
import { localize } from "./lib/localize";
import {
  bookTimeSlot,
  selectFirstAvailableTimeSlotNextMonth,
  setupManagedEvent,
  submitAndWaitForResponse,
} from "./lib/testUtils";

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

/** Short hand to get elements by translation key */
const getByKey = async (page: Page, key: string) => page.getByText((await localize("en"))(key));

test.describe("Managed Event Types", () => {
  /** We don't use setupManagedEvent here to test the actual creation flow */
  test("Can create managed event type", async ({ page, users }) => {
    // Creating the owner user of the team
    const adminUser = await users.create(
      { name: "Owner" },
      {
        hasTeam: true,
        teammates: [{ name: "teammate-1" }],
      }
    );
    // Creating the member user of the team
    // First we work with owner user, logging in
    await adminUser.apiLogin();
    // Let's create a team
    // Going to create an event type
    await page.goto("/event-types");
    const tabItem = page.getByTestId("horizontal-tab-Owner").first();
    await expect(tabItem).toBeVisible();
    // We wait until loading is finished
    await page.waitForSelector('[data-testid="event-types"]');
    await page.getByTestId("new-event-type").click();
    await page.getByTestId("option-team-1").click();
    // Expecting we can add a managed event type as team owner
    const locator = page.locator('div:has(input[value="MANAGED"]) > button');

    await expect(locator).toBeVisible();
    // Actually creating a managed event type to test things further
    await locator.click();
    await page.fill("[name=title]", "managed");
    await page.click("[type=submit]");

    await page.waitForURL("event-types/**");
    expect(page.url()).toContain("?tabName=team");
  });

  /** From here we use setupManagedEvent to avoid repeating the previous flow */
  test("Has unlocked fields for admin", async ({ page, users }) => {
    const { adminUser, managedEvent } = await setupManagedEvent({ users });
    await adminUser.apiLogin();
    await page.goto(`/event-types/${managedEvent.id}?tabName=setup`);
    await page.getByTestId("update-eventtype").waitFor();
    await expect(page.locator('input[name="title"]')).toBeEditable();
    await expect(page.locator('input[name="slug"]')).toBeEditable();
    await expect(page.locator('input[name="length"]')).toBeEditable();
  });

  test("Exists for added member", async ({ page, users }) => {
    const { memberUser, teamEventTitle } = await setupManagedEvent({
      users,
    });
    await memberUser.apiLogin();
    await page.goto("/event-types");
    await expect(
      page.getByTestId("event-types").locator("div").filter({ hasText: teamEventTitle }).nth(1)
    ).toBeVisible();
  });

  test("Can use Organizer's default app as location", async ({ page, users }) => {
    const { adminUser, managedEvent } = await setupManagedEvent({ users });
    await adminUser.apiLogin();
    await page.goto(`/event-types/${managedEvent.id}?tabName=setup`);
    await expect(page.getByTestId("vertical-tab-basics")).toHaveAttribute("aria-current", "page"); // fix the race condition
    await expect(page.getByTestId("vertical-tab-basics")).toContainText("Basics"); //fix the race condition

    await page.locator("#location-select").click();
    const targetText = (await localize("en"))("organizer_default_conferencing_app");
    const options = page.locator('[data-testid="location-select-item-conferencing"]');
    const targetOption = options.locator(`text=${targetText}`);
    await expect(targetOption).toBeVisible();
    await targetOption.click();
    await saveAndWaitForResponse(page);

    await page.getByTestId("vertical-tab-assignment").click();
    await gotoBookingPage(page);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);

    await expect(page.getByTestId("success-page")).toBeVisible();
  });

  test("Has locked fields for added member", async ({ page, users }) => {
    const { memberUser } = await setupManagedEvent({
      users,
    });
    await memberUser.apiLogin();
    const managedEvent = await memberUser.getFirstEventAsOwner();
    await page.goto(`/event-types/${managedEvent.id}?tabName=setup`);
    await page.waitForURL("event-types/**");

    await expect(page.locator('input[name="title"]')).not.toBeEditable();
    await expect(page.locator('input[name="slug"]')).not.toBeEditable();
    await expect(page.locator('input[name="length"]')).not.toBeEditable();
  });

  test("Provides discrete field lock/unlock state for admin", async ({ page, users }) => {
    const { adminUser, teamEventTitle } = await setupManagedEvent({ users });
    await adminUser.apiLogin();
    const teamMembership = await adminUser.getFirstTeamMembership();

    await page.goto(`/event-types?teamId=${teamMembership.team.id}`);

    await page.getByTestId("event-types").locator(`a[title="${teamEventTitle}"]`).click();
    await page.waitForURL("event-types/**");

    // Locked by default
    const titleLockIndicator = page.getByTestId("locked-indicator-title");
    await expect(titleLockIndicator).toBeVisible();
    await expect(titleLockIndicator.locator("[data-state='checked']")).toHaveCount(1);

    // Proceed to unlock and check that it got unlocked
    titleLockIndicator.click();
    await expect(titleLockIndicator.locator("[data-state='checked']")).toHaveCount(0, { timeout: 0 });
    await expect(titleLockIndicator.locator("[data-state='unchecked']")).toHaveCount(1);

    // Save changes
    await page.locator('[type="submit"]').click();
    await expect(titleLockIndicator.locator("[data-state='unchecked']")).toHaveCount(1);
  });

  test("Shows discretionally unlocked field to member", async ({ page, users }) => {
    const { memberUser, teamEventTitle } = await setupManagedEvent({
      users,
      unlockedFields: {
        title: true,
      },
    });
    await memberUser.apiLogin();
    await page.goto("/event-types");
    await page.getByTestId("event-types").locator(`a[title="${teamEventTitle}"]`).click();
    await page.waitForURL("event-types/**");

    await expect(page.locator('input[name="title"]')).toBeEditable();
  });

  test("Should only update the unlocked fields modified by Admin", async ({
    page: memberPage,
    users,
    browser,
  }) => {
    const { adminUser, memberUser, teamEventTitle, teamId } = await setupManagedEvent({
      users,
      unlockedFields: {
        title: true,
      },
    });
    await memberUser.apiLogin();
    await memberPage.goto("/event-types");
    await memberPage.getByTestId("event-types").locator(`a[title="${teamEventTitle}"]`).click();
    await memberPage.waitForURL("event-types/**");
    await expect(memberPage.locator('input[name="title"]')).toBeEditable();
    await memberPage.locator('input[name="title"]').fill(`Managed Event Title`);
    await saveAndWaitForResponse(memberPage);

    // We edit the managed event as original owner
    const [adminContext, adminPage] = await adminUser.apiLoginOnNewBrowser(browser);
    await adminPage.goto(`/event-types?teamId=${teamId}`);
    await adminPage.getByTestId("event-types").locator(`a[title="${teamEventTitle}"]`).click();
    await adminPage.waitForURL("event-types/**");
    await adminPage.locator('input[name="length"]').fill(`45`);
    await saveAndWaitForResponse(adminPage);
    await adminContext.close();

    await memberPage.goto("/event-types");
    await memberPage.getByTestId("event-types").locator('a[title="Managed Event Title"]').click();
    await memberPage.waitForURL("event-types/**");
    //match length
    expect(await memberPage.locator("[data-testid=duration]").getAttribute("value")).toBe("45");
    //ensure description didn't update
    expect(await memberPage.locator(`input[name="title"]`).getAttribute("value")).toBe(`Managed Event Title`);
    await memberPage.locator('input[name="title"]').fill(`managed`);
    // Save changes
    await saveAndWaitForResponse(memberPage);
  });

  const MANAGED_EVENT_TABS: { slug: string; locator: (page: Page) => Locator | Promise<Locator> }[] = [
    { slug: "setup", locator: (page) => getByKey(page, "allow_multiple_durations") },
    {
      slug: "team",
      locator: (page) => getByKey(page, "automatically_add_all_team_members"),
    },
    {
      slug: "availability",
      locator: (page) => getByKey(page, "members_default_schedule_description"),
    },
    {
      slug: "limits",
      locator: (page) => getByKey(page, "before_event"),
    },
    {
      slug: "advanced",
      locator: (page) => getByKey(page, "event_name_in_calendar"),
    },
    {
      slug: "apps",
      locator: (page) => page.getByRole("heading", { name: "No apps installed" }),
    },
    {
      slug: "workflows",
      locator: (page) => page.getByTestId("empty-screen").getByRole("heading", { name: "Workflows" }),
    },
    {
      slug: "ai",
      locator: (page) => page.getByTestId("empty-screen").getByRole("heading", { name: "Cal.ai" }),
    },
  ];

  MANAGED_EVENT_TABS.forEach((tab) => {
    test(`Can render "${tab.slug}" tab`, async ({ page, users }) => {
      const { adminUser, managedEvent } = await setupManagedEvent({ users });
      // First we work with owner user, logging in
      await adminUser.apiLogin();
      await page.goto(`/event-types/${managedEvent.id}?tabName=${tab.slug}`);
      await expect(await tab.locator(page)).toBeVisible();
    });
  });
});

async function gotoBookingPage(page: Page) {
  const previewLink = await page.getByTestId("preview-button").getAttribute("href");

  await page.goto(previewLink ?? "");
}

async function saveAndWaitForResponse(page: Page) {
  await submitAndWaitForResponse(page, "/api/trpc/eventTypesHeavy/update?batch=1");
}
