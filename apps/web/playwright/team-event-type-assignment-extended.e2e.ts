import { prisma } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import type { Page } from "@playwright/test";
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

const SMALL_TEAM_SIZE = 3;

async function createSmallTeamWithEvent(
  users: Parameters<Parameters<typeof test>[2]>[0]["users"],
  schedulingType: SchedulingType
) {
  const teamMatesObj = Array.from({ length: SMALL_TEAM_SIZE }, (_, i) => ({
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

async function createManagedEventWithMembers(
  users: Parameters<Parameters<typeof test>[2]>[0]["users"]
) {
  const teamMatesObj = Array.from({ length: SMALL_TEAM_SIZE }, (_, i) => ({
    name: `teammate-${i + 1}`,
  }));

  const adminUser = await users.create(null, {
    hasTeam: true,
    teammates: teamMatesObj,
    teamEventTitle: "Managed",
    teamEventSlug: "managed",
    schedulingType: "MANAGED" as SchedulingType,
    addManagedEventToTeamMates: true,
  });

  await adminUser.apiLogin();
  const { team } = await adminUser.getFirstTeamMembership();
  const managedEvent = await adminUser.getFirstTeamEvent(team.id, SchedulingType.MANAGED);
  return { adminUser, team, managedEvent, teamMatesObj };
}

async function navigateToAssignmentTab(page: Page, eventId: number) {
  await page.goto(`/event-types/${eventId}?tabName=team`);
  await expect(page).toHaveURL(/event-types\/\d+\?tabName=team/);
  await page.waitForLoadState("networkidle");
  const form = page.locator("#event-type-form");
  await expect(form).toBeVisible();
  return form;
}

async function navigateToAvailabilityTab(page: Page, eventId: number) {
  await page.goto(`/event-types/${eventId}?tabName=availability`);
  await expect(page).toHaveURL(/event-types\/\d+\?tabName=availability/);
  await page.waitForLoadState("networkidle");
  const form = page.locator("#event-type-form");
  await expect(form).toBeVisible();
  return form;
}

test.describe("Team Event Type - Availability Tab with Hosts", () => {
  test("Availability tab loads and displays host schedule section for a team event", async ({
    page,
    users,
  }) => {
    test.slow();
    const { teamEvent } = await createSmallTeamWithEvent(users, SchedulingType.ROUND_ROBIN);

    const form = await navigateToAvailabilityTab(page, teamEvent.id);

    // The availability tab should display the "Choose host schedules" section for team events
    await expect(form.getByText("Choose host schedules")).toBeVisible({ timeout: 10000 });
  });

  test("Availability tab loads for a Collective team event", async ({ page, users }) => {
    test.slow();
    const { teamEvent } = await createSmallTeamWithEvent(users, SchedulingType.COLLECTIVE);

    const form = await navigateToAvailabilityTab(page, teamEvent.id);

    // The availability tab should render without errors for collective events
    await expect(form.getByText("Choose host schedules")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Team Event Type - Add Host to Collective Event", () => {
  test("Can add a host back after removal on a Collective event", async ({ page, users }) => {
    test.slow();
    const { teamEvent } = await createSmallTeamWithEvent(users, SchedulingType.COLLECTIVE);
    const form = await navigateToAssignmentTab(page, teamEvent.id);

    const targetHost = "teammate-1";

    const initialHosts = await prisma.host.findMany({
      where: { eventTypeId: teamEvent.id },
      select: { userId: true },
    });

    // Remove the host
    const hostRow = form.locator("li").filter({ hasText: targetHost });
    await expect(hostRow).toBeVisible();
    await hostRow.locator("svg").last().click();
    await expect(form.locator("li").filter({ hasText: targetHost })).not.toBeVisible();

    // Add the host back using the combobox
    const hostSelect = form.getByRole("combobox").last();
    await hostSelect.click();
    await hostSelect.fill(targetHost);
    await page.waitForTimeout(500);
    await page.locator('[id*="-option-"]').filter({ hasText: targetHost }).click();

    await expect(form.locator("li").filter({ hasText: targetHost })).toBeVisible();

    await saveEventType(page);

    const hostsAfterSave = await prisma.host.findMany({
      where: { eventTypeId: teamEvent.id },
      select: {
        userId: true,
        user: { select: { name: true } },
      },
    });
    expect(hostsAfterSave).toHaveLength(initialHosts.length);
    expect(hostsAfterSave.map((h) => h.user.name)).toContain(targetHost);
  });
});

test.describe("Team Event Type - Assign All Team Members Toggle Persistence", () => {
  test("Assign all team members toggle state persists after saving", async ({ page, users }) => {
    test.slow();
    const { teamEvent } = await createSmallTeamWithEvent(users, SchedulingType.ROUND_ROBIN);
    const form = await navigateToAssignmentTab(page, teamEvent.id);

    // The data-testid is on the Radix Switch Root element itself
    const switchEl = page.getByTestId("assign-all-team-members-toggle");
    await expect(switchEl).toBeVisible();

    // Enable assign all team members
    const isChecked = await switchEl.getAttribute("data-state");
    if (isChecked !== "checked") {
      await switchEl.click();
    }

    // Verify it's now checked
    await expect(switchEl).toHaveAttribute("data-state", "checked");

    await saveEventType(page);

    // Verify in the database
    const eventType = await prisma.eventType.findUnique({
      where: { id: teamEvent.id },
      select: { assignAllTeamMembers: true },
    });
    expect(eventType?.assignAllTeamMembers).toBe(true);

    // Reload and verify UI reflects the saved state
    await page.reload();
    await page.waitForLoadState("networkidle");

    const switchAfterReload = page.getByTestId("assign-all-team-members-toggle");
    await expect(switchAfterReload).toBeVisible();
    await expect(switchAfterReload).toHaveAttribute("data-state", "checked");
  });

  test("Disabling assign all team members persists after saving", async ({ page, users }) => {
    test.slow();

    // Create with assignAllTeamMembers enabled
    const teamMatesObj = Array.from({ length: SMALL_TEAM_SIZE }, (_, i) => ({
      name: `teammate-${i + 1}`,
    }));
    const owner = await users.create(
      { username: "pro-user", name: "pro-user" },
      {
        hasTeam: true,
        teammates: teamMatesObj,
        schedulingType: SchedulingType.ROUND_ROBIN,
        assignAllTeamMembers: true,
      }
    );
    await owner.apiLogin();
    const { team } = await owner.getFirstTeamMembership();
    const teamEvent = await owner.getFirstTeamEvent(team.id);

    const form = await navigateToAssignmentTab(page, teamEvent.id);

    const switchEl = page.getByTestId("assign-all-team-members-toggle");
    await expect(switchEl).toBeVisible();

    // Should be checked initially
    await expect(switchEl).toHaveAttribute("data-state", "checked");

    // Disable it
    await switchEl.click();
    await expect(switchEl).toHaveAttribute("data-state", "unchecked");

    await saveEventType(page);

    // Verify in the database
    const eventType = await prisma.eventType.findUnique({
      where: { id: teamEvent.id },
      select: { assignAllTeamMembers: true },
    });
    expect(eventType?.assignAllTeamMembers).toBe(false);

    // Reload and verify
    await page.reload();
    await page.waitForLoadState("networkidle");

    const switchAfterReload = page.getByTestId("assign-all-team-members-toggle");
    await expect(switchAfterReload).toBeVisible();
    await expect(switchAfterReload).toHaveAttribute("data-state", "unchecked");
  });
});

test.describe("Team Event Type - Managed Event Children Assignment", () => {
  test("Can remove a member from a managed event type", async ({ page, users }) => {
    test.slow();
    const { managedEvent } = await createManagedEventWithMembers(users);

    const form = await navigateToAssignmentTab(page, managedEvent.id);

    // Verify children are displayed
    const initialChildren = await prisma.eventType.findMany({
      where: { parentId: managedEvent.id },
      select: { userId: true },
    });
    const initialChildCount = initialChildren.length;
    expect(initialChildCount).toBeGreaterThan(0);

    // Find and remove a member (teammate-1) via the close/remove button
    const memberRow = form.locator('[data-testid="assignment-dropdown"]').locator("..").locator("..").locator("li, [class*='multiValue']").filter({ hasText: "teammate-1" });

    // If the member is shown as a multi-value tag, click its remove button
    // The ChildrenEventTypeSelect renders members as tags with remove buttons
    const removeButton = memberRow.locator("svg, [role='button']").last();
    if (await removeButton.isVisible()) {
      await removeButton.click();
    }

    await saveEventType(page);

    // Verify the child was removed from the database
    const childrenAfterSave = await prisma.eventType.findMany({
      where: { parentId: managedEvent.id },
      select: { userId: true },
    });
    expect(childrenAfterSave.length).toBeLessThan(initialChildCount);
  });

  test("Can add a member back after removal on a managed event type", async ({ page, users }) => {
    test.slow();
    const { managedEvent } = await createManagedEventWithMembers(users);

    const initialChildren = await prisma.eventType.findMany({
      where: { parentId: managedEvent.id },
      select: { userId: true },
    });
    const initialChildCount = initialChildren.length;
    expect(initialChildCount).toBeGreaterThan(0);

    const form = await navigateToAssignmentTab(page, managedEvent.id);

    const targetMember = "teammate-1";

    // Remove the member via the delete button (X icon) in the list
    const memberRow = form.locator("li").filter({ hasText: targetMember });
    await expect(memberRow).toBeVisible();
    // The delete button uses StartIcon="x" - it's the last button in the row
    await memberRow.locator("button").last().click();
    await expect(form.locator("li").filter({ hasText: targetMember })).not.toBeVisible();

    // Add the member back using the assignment dropdown
    const dropdownInput = form.locator('[data-testid="assignment-dropdown"]').locator("input");
    await dropdownInput.click();
    await dropdownInput.fill(targetMember);
    await page.waitForTimeout(500);
    await page.locator('[id*="-option-"]').filter({ hasText: targetMember }).click();

    // Verify the member appears in the list again
    await expect(form.locator("li").filter({ hasText: targetMember })).toBeVisible();

    await saveEventType(page);

    // Verify children count is preserved after save
    const childrenAfterSave = await prisma.eventType.findMany({
      where: { parentId: managedEvent.id },
      select: { userId: true },
    });
    expect(childrenAfterSave.length).toBe(initialChildCount);
  });
});
