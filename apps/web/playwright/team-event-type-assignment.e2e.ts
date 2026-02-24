import { prisma } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { test } from "./lib/fixtures";
import { submitAndWaitForResponse } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

async function saveEventType(page: Page) {
  await submitAndWaitForResponse(page, "/api/trpc/eventTypesHeavy/update?batch=1", {
    action: () => page.locator("[data-testid=update-eventtype]").click(),
  });
}

const TEAM_SIZE = 40;
const TARGET_HOST = "teammate-30";

async function createTeamWithEvent(
  users: Parameters<Parameters<typeof test>[2]>[0]["users"],
  schedulingType: SchedulingType
) {
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

async function navigateToAssignmentTab(page: Page, eventId: number) {
  await page.goto(`/event-types/${eventId}?tabName=team`);
  await page.waitForLoadState("networkidle");
  const form = page.locator("#event-type-form");
  await expect(form).toBeVisible();
  return form;
}

/**
 * With paginated host fetching (20 per page), hosts beyond page 1 aren't in
 * the DOM until the scroll container triggers infinite-scroll loading.
 * This helper scrolls the virtualized host list until the target host appears.
 */
async function scrollToHost(form: Locator, hostName: string, page: Page): Promise<Locator> {
  const hostRow = form.locator("li").filter({ hasText: hostName });

  for (let attempt = 0; attempt < 15; attempt++) {
    if ((await hostRow.count()) > 0 && (await hostRow.isVisible())) {
      return hostRow;
    }
    const scrollContainers = form.locator('[class*="overflow-y-auto"]');
    const count = await scrollContainers.count();
    for (let i = 0; i < count; i++) {
      await scrollContainers.nth(i).evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
    }
    await page.waitForTimeout(500);
  }

  await expect(hostRow).toBeVisible();
  return hostRow;
}

test.describe("Team Event Type - Assignment Tab", () => {
  test("Displays hosts on the Collective assignment tab", async ({ page, users }) => {
    test.slow();
    const { teamEvent } = await createTeamWithEvent(users, SchedulingType.COLLECTIVE);

    const form = await navigateToAssignmentTab(page, teamEvent.id);

    await expect(form.getByText("Fixed hosts").first()).toBeVisible();
    await scrollToHost(form, TARGET_HOST, page);
  });

  test("Displays hosts on the Round Robin assignment tab", async ({ page, users }) => {
    test.slow();
    const { teamEvent } = await createTeamWithEvent(users, SchedulingType.ROUND_ROBIN);

    const form = await navigateToAssignmentTab(page, teamEvent.id);

    await expect(form.getByText("Round-robin hosts")).toBeVisible();
    await scrollToHost(form, TARGET_HOST, page);
  });

  test("Can switch scheduling type from Collective to Round Robin and save", async ({ page, users }) => {
    test.slow();
    const { teamEvent } = await createTeamWithEvent(users, SchedulingType.COLLECTIVE);

    await navigateToAssignmentTab(page, teamEvent.id);

    const form = page.locator("#event-type-form");
    const schedulingTypeSelect = form.getByText("Scheduling type").locator("..").getByRole("combobox");
    await schedulingTypeSelect.click();
    await page.locator('[id*="-option-"]').filter({ hasText: "Round robin" }).click();

    await expect(form.getByText("Round-robin hosts")).toBeVisible();

    await saveEventType(page);

    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#event-type-form").getByText("Round-robin hosts")).toBeVisible();
  });

  test("Can switch scheduling type from Round Robin to Collective and save", async ({ page, users }) => {
    test.slow();
    const { teamEvent } = await createTeamWithEvent(users, SchedulingType.ROUND_ROBIN);

    await navigateToAssignmentTab(page, teamEvent.id);

    const form = page.locator("#event-type-form");
    const schedulingTypeSelect = form.getByText("Scheduling type").locator("..").getByRole("combobox");
    await schedulingTypeSelect.click();
    await page.locator('[id*="-option-"]').filter({ hasText: "Collective" }).click();

    await expect(form.getByText("Fixed hosts").first()).toBeVisible();

    await saveEventType(page);

    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#event-type-form").getByText("Fixed hosts").first()).toBeVisible();
  });
});

test.describe("Team Event Type - Round Robin Weights", () => {
  test("Can see weights toggle on Round Robin event", async ({ page, users }) => {
    test.slow();
    const { teamEvent } = await createTeamWithEvent(users, SchedulingType.ROUND_ROBIN);

    const form = await navigateToAssignmentTab(page, teamEvent.id);

    await expect(form.getByText("Enable weights")).toBeVisible();
  });

  test("Can open edit weights sheet and edit a host weight", async ({ page, users }) => {
    test.slow();
    const { teamEvent } = await createTeamWithEvent(users, SchedulingType.ROUND_ROBIN);
    const form = await navigateToAssignmentTab(page, teamEvent.id);

    const weightsSection = form.locator("fieldset").filter({ hasText: "Enable weights" });
    await weightsSection.getByRole("switch").click();

    const editWeightsButton = form.getByRole("button", { name: "Edit weights" });
    await expect(editWeightsButton).toBeVisible();
    await editWeightsButton.click();

    const sheet = page.locator("[role=dialog]");
    await expect(sheet).toBeVisible();

    const memberRow = sheet.locator("div.flex.h-12.items-center").filter({ hasText: TARGET_HOST });
    await memberRow.scrollIntoViewIfNeeded();
    await expect(memberRow).toBeVisible();

    const weightButton = memberRow.locator("button");
    await expect(weightButton).toContainText("100%");
    await weightButton.click();

    const weightInput = memberRow.locator("input[type=number]");
    await expect(weightInput).toBeVisible();
    await weightInput.fill("75");
    await weightInput.press("Enter");

    await expect(memberRow.locator("button")).toContainText("75%");
  });

  test("Weight changes via weights sheet persist after saving", async ({ page, users }) => {
    test.slow();
    const { teamEvent } = await createTeamWithEvent(users, SchedulingType.ROUND_ROBIN);
    const form = await navigateToAssignmentTab(page, teamEvent.id);

    const weightsSection = form.locator("fieldset").filter({ hasText: "Enable weights" });
    await weightsSection.getByRole("switch").click();

    await form.getByRole("button", { name: "Edit weights" }).click();

    const sheet = page.locator("[role=dialog]");
    await expect(sheet).toBeVisible();

    const memberRow = sheet.locator("div.flex.h-12.items-center").filter({ hasText: TARGET_HOST });
    await memberRow.scrollIntoViewIfNeeded();
    await memberRow.locator("button").click();

    const weightInput = memberRow.locator("input[type=number]");
    await weightInput.fill("50");
    await weightInput.press("Enter");

    await sheet.getByRole("button", { name: "Done" }).click();
    await expect(sheet).not.toBeVisible();

    await saveEventType(page);

    const hostsAfterSave = await prisma.host.findMany({
      where: { eventTypeId: teamEvent.id },
      select: {
        weight: true,
        user: { select: { name: true } },
      },
    });
    const targetHost = hostsAfterSave.find((h) => h.user.name === TARGET_HOST);
    expect(targetHost).toBeDefined();
    expect(targetHost?.weight).toBe(50);
  });

  test("Can search for a team member in the weights sheet", async ({ page, users }) => {
    test.slow();
    const { teamEvent } = await createTeamWithEvent(users, SchedulingType.ROUND_ROBIN);
    const form = await navigateToAssignmentTab(page, teamEvent.id);

    const weightsSection = form.locator("fieldset").filter({ hasText: "Enable weights" });
    await weightsSection.getByRole("switch").click();

    await form.getByRole("button", { name: "Edit weights" }).click();

    const sheet = page.locator("[role=dialog]");
    await expect(sheet).toBeVisible();

    const searchInput = sheet.getByPlaceholder("Search");
    await searchInput.fill(TARGET_HOST);

    const visibleMembers = sheet.locator("div.flex.h-12.items-center");
    await expect(visibleMembers).toHaveCount(1);
    await expect(visibleMembers.first()).toContainText(TARGET_HOST);
  });
});

test.describe("Team Event Type - Host Assignment and Removal", () => {
  test("Can remove a host from a Collective event type", async ({ page, users }) => {
    test.slow();
    const { teamEvent } = await createTeamWithEvent(users, SchedulingType.COLLECTIVE);
    const form = await navigateToAssignmentTab(page, teamEvent.id);

    const initialHosts = await prisma.host.findMany({
      where: { eventTypeId: teamEvent.id },
      select: { userId: true },
    });

    const hostRow = await scrollToHost(form, TARGET_HOST, page);
    await hostRow.locator("svg").last().click();
    await expect(form.locator("li").filter({ hasText: TARGET_HOST })).not.toBeVisible();

    await saveEventType(page);

    const hostsAfterSave = await prisma.host.findMany({
      where: { eventTypeId: teamEvent.id },
      select: {
        userId: true,
        user: { select: { name: true } },
      },
    });
    expect(hostsAfterSave).toHaveLength(initialHosts.length - 1);
    expect(hostsAfterSave.map((h) => h.user.name)).not.toContain(TARGET_HOST);
  });

  test("Can remove a host from a Round Robin event type", async ({ page, users }) => {
    test.slow();
    const { teamEvent } = await createTeamWithEvent(users, SchedulingType.ROUND_ROBIN);
    const form = await navigateToAssignmentTab(page, teamEvent.id);

    const initialHosts = await prisma.host.findMany({
      where: { eventTypeId: teamEvent.id },
      select: { userId: true },
    });

    const hostRow = await scrollToHost(form, TARGET_HOST, page);
    await hostRow.locator("svg").last().click();
    await expect(form.locator("li").filter({ hasText: TARGET_HOST })).not.toBeVisible();

    await saveEventType(page);

    const hostsAfterSave = await prisma.host.findMany({
      where: { eventTypeId: teamEvent.id },
      select: {
        userId: true,
        user: { select: { name: true } },
      },
    });
    expect(hostsAfterSave).toHaveLength(initialHosts.length - 1);
    expect(hostsAfterSave.map((h) => h.user.name)).not.toContain(TARGET_HOST);
  });

  test("Can add a host back after removal on a Round Robin event", async ({ page, users }) => {
    test.slow();
    const { teamEvent } = await createTeamWithEvent(users, SchedulingType.ROUND_ROBIN);
    const form = await navigateToAssignmentTab(page, teamEvent.id);

    const initialHosts = await prisma.host.findMany({
      where: { eventTypeId: teamEvent.id },
      select: { userId: true },
    });

    const hostRow = await scrollToHost(form, TARGET_HOST, page);
    await hostRow.locator("svg").last().click();
    await expect(form.locator("li").filter({ hasText: TARGET_HOST })).not.toBeVisible();

    // The RR host select combobox (scheduling type dropdown is first, host select is after)
    const hostSelect = form.getByRole("combobox").last();
    await hostSelect.click();
    await hostSelect.fill(TARGET_HOST);
    // Wait for async search results to load
    await page.waitForTimeout(500);
    await page.locator('[id*="-option-"]').filter({ hasText: TARGET_HOST }).click();

    await expect(form.locator("li").filter({ hasText: TARGET_HOST })).toBeVisible();

    await saveEventType(page);

    const hostsAfterSave = await prisma.host.findMany({
      where: { eventTypeId: teamEvent.id },
      select: {
        userId: true,
        user: { select: { name: true } },
      },
    });
    expect(hostsAfterSave).toHaveLength(initialHosts.length);
    expect(hostsAfterSave.map((h) => h.user.name)).toContain(TARGET_HOST);
  });

  test("Can toggle assign all team members on a Round Robin event", async ({ page, users }) => {
    test.slow();
    const { teamEvent } = await createTeamWithEvent(users, SchedulingType.ROUND_ROBIN);
    const form = await navigateToAssignmentTab(page, teamEvent.id);

    await expect(form.getByText("Add all team members, including future members")).toBeVisible();
    const toggle = page.getByTestId("assign-all-team-members-toggle");
    await expect(toggle).toBeVisible();
  });

  test("Host removal persists after saving and reloading", async ({ page, users }) => {
    test.slow();
    const { teamEvent } = await createTeamWithEvent(users, SchedulingType.ROUND_ROBIN);
    const form = await navigateToAssignmentTab(page, teamEvent.id);

    const initialHosts = await prisma.host.findMany({
      where: { eventTypeId: teamEvent.id },
      select: { userId: true },
    });
    const initialCount = initialHosts.length;

    const hostRow = await scrollToHost(form, TARGET_HOST, page);
    await hostRow.locator("svg").last().click();
    await expect(form.locator("li").filter({ hasText: TARGET_HOST })).not.toBeVisible();

    await saveEventType(page);

    const hostsAfterSave = await prisma.host.findMany({
      where: { eventTypeId: teamEvent.id },
      select: {
        userId: true,
        user: { select: { name: true } },
      },
    });
    expect(hostsAfterSave).toHaveLength(initialCount - 1);
    const remainingNames = hostsAfterSave.map((h) => h.user.name);
    expect(remainingNames).not.toContain(TARGET_HOST);

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(
      page.locator("#event-type-form").locator("li").filter({ hasText: TARGET_HOST })
    ).not.toBeVisible();
  });
});

test.describe("Team Event Type - Managed Event Assignment", () => {
  test("Can navigate to managed event assignment tab and see members", async ({ page, users }) => {
    test.slow();
    const teamMatesObj = Array.from({ length: TEAM_SIZE }, (_, i) => ({
      name: `teammate-${i + 1}`,
    }));

    const adminUser = await users.create(null, {
      hasTeam: true,
      teammates: teamMatesObj,
      teamEventTitle: "Managed",
      teamEventSlug: "managed",
      schedulingType: "MANAGED",
      addManagedEventToTeamMates: true,
    });

    await adminUser.apiLogin();
    const { team } = await adminUser.getFirstTeamMembership();
    const managedEvent = await adminUser.getFirstTeamEvent(team.id, SchedulingType.MANAGED);

    await page.goto(`/event-types/${managedEvent.id}?tabName=team`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.locator("#event-type-form").getByText("Add all team members, including future members")
    ).toBeVisible();
  });
});
