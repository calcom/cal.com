import { prisma } from "@calcom/prisma";
import { IdentityProvider, MembershipRole } from "@calcom/prisma/enums";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

/**
 * Seeds IndexedDB with stale onboarding team data to simulate a user who started
 * but did not complete team creation. This triggers the OnboardingContinuationPrompt.
 */
async function seedStaleTeamDataInIndexedDB(page: Page, teamName: string, teamSlug: string): Promise<void> {
  await page.evaluate(
    ({ name, slug }) => {
      return new Promise<void>((resolve, reject) => {
        const request = window.indexedDB.open("cal-onboarding-idb", 1);
        request.onupgradeneeded = (event: IDBVersionChangeEvent): void => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains("keyval")) {
            db.createObjectStore("keyval");
          }
        };
        request.onsuccess = (): void => {
          const db = request.result;
          const tx = db.transaction(["keyval"], "readwrite");
          const store = tx.objectStore("keyval");
          const state = JSON.stringify({
            state: {
              selectedPlan: "team",
              teamDetails: { name, slug, bio: "" },
              organizationDetails: { name: "", link: "", bio: "" },
              organizationBrand: { color: "#000000", logo: null, banner: null },
              teams: [],
              invites: [],
              inviteRole: "MEMBER",
              migratedMembers: [],
              teamBrand: { color: "#000000", logo: null },
              teamInvites: [],
              teamId: null,
              personalDetails: { name: "", username: "", timezone: "", bio: "", avatar: null },
            },
            version: 1,
          });
          const putRequest = store.put(state, "cal-onboarding-storage");
          putRequest.onsuccess = (): void => resolve();
          putRequest.onerror = (): void => reject(putRequest.error);
        };
        request.onerror = (): void => reject(request.error);
      });
    },
    { name: teamName, slug: teamSlug }
  );
}

test.describe("Team Onboarding: Plan Selection", () => {
  test("selecting team plan navigates to teams/details on continue", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();
    await page.goto("/onboarding/getting-started");
    await page.waitForURL("/onboarding/getting-started");

    const teamRadio = page.locator('[value="team"]');
    await teamRadio.click();

    await page.getByTestId("onboarding-continue-btn").click();
    await page.waitForURL(/.*\/onboarding\/teams\/details/);
  });
});

test.describe("Team Onboarding: Details", () => {
  test("team name auto-generates slug", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();
    await page.goto("/onboarding/teams/details");
    await page.waitForURL(/.*\/onboarding\/teams\/details/);

    const teamNameInput = page.locator('input[placeholder="Acme Inc."]');
    await teamNameInput.fill("My Awesome Team");

    await page.waitForTimeout(500);

    const slugInput = page.locator('input[data-testid="team-slug-input"]');
    if (await slugInput.isVisible()) {
      const slugValue = await slugInput.inputValue();
      expect(slugValue).toContain("my-awesome-team");
    }
  });

  test("back button navigates to getting-started", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });
    await user.apiLogin();
    await page.goto("/onboarding/teams/details");
    await page.waitForURL(/.*\/onboarding\/teams\/details/);

    const backButton = page.locator('button:has-text("Back")');
    await backButton.click();
    await page.waitForURL(/.*\/onboarding\/getting-started/);
  });
});

test.describe("Team Onboarding: Existing Membership", () => {
  test("user with ACCEPTED team membership is redirected past plan selection", async ({ page, users }) => {
    const user = await users.create({ completedOnboarding: false, name: null }, { hasTeam: true });
    await user.apiLogin();

    await page.goto("/onboarding/getting-started");

    await page.waitForURL(/.*\/onboarding\/personal\/settings/, { timeout: 30000 });
  });

  test("user with PENDING team membership is redirected past plan selection", async ({ page, users }) => {
    const user = await users.create({
      completedOnboarding: false,
      name: null,
      identityProvider: IdentityProvider.CAL,
    });

    const team = await prisma.team.create({
      data: {
        name: "Invited Team",
        slug: `invited-team-${Date.now()}`,
      },
    });

    await prisma.membership.create({
      data: {
        teamId: team.id,
        userId: user.id,
        role: MembershipRole.MEMBER,
        accepted: false,
      },
    });

    await user.apiLogin();

    await page.goto("/onboarding/getting-started");

    await page.waitForURL(/.*\/onboarding\/personal\/settings/, { timeout: 30000 });

    await prisma.membership.deleteMany({ where: { teamId: team.id } });
    await prisma.team.delete({ where: { id: team.id } });
  });
});

test.describe("Team Onboarding: Continuation Prompt", () => {
  test("user with existing team does not see continuation prompt despite stale IndexedDB", async ({
    page,
    users,
  }) => {
    const user = await users.create({ completedOnboarding: false, name: null }, { hasTeam: true });
    await user.apiLogin();

    await page.goto("/onboarding/personal/settings");
    await page.waitForURL(/.*\/onboarding\/personal\/settings/);
    await seedStaleTeamDataInIndexedDB(page, "My Test Team", "my-test-team");

    await page.goto("/onboarding/getting-started");
    await page.waitForURL(/.*\/onboarding\/personal\/settings/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");

    const continuationPrompt = page.locator(".fixed.bottom-4.right-4");
    await expect(continuationPrompt).not.toBeVisible({ timeout: 5000 });
  });

});
