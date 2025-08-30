import { expect } from "@playwright/test";
import type { createUsersFixture } from "playwright/fixtures/users";

import { generateHashedLink } from "@calcom/lib/generateHashedLink";

import { test } from "../lib/fixtures";
import { bookEventOnThisPage, doOnOrgDomain } from "../lib/testUtils";

test.describe.configure({ mode: "parallel" });

const orgSlug = "example";

/**
 * Creates a user with an unpublished organization and a team.
 * @param users - The users fixture.
 * @returns The created user.
 */
async function createUserWithOrganizationAndTeam(users: ReturnType<typeof createUsersFixture>) {
  const orgOwnerUsernamePrefix = "owner";
  const orgOwnerEmail = users.trackEmail({
    username: orgOwnerUsernamePrefix,
    domain: `example.com`,
  });
  const orgOwnerUser = await users.create(
    {
      username: orgOwnerUsernamePrefix,
      email: orgOwnerEmail,
      role: "ADMIN",
      roleInOrganization: "OWNER",
    },
    {
      isOrg: true,
      isUnpublished: true,
      orgRequestedSlug: orgSlug,
      hasSubteam: true,
      hasTeam: true,
    }
  );
  return orgOwnerUser;
}

test.describe("Unpublished Organization Redirection", () => {
  test.afterEach(({ orgs, users }) => {
    orgs.deleteAll();
    users.deleteAll();
  });

  test.describe("Team Profile & Event Booking", () => {
    test("should not be able to see team profile by default", async ({ page, users }) => {
      const orgOwner = await createUserWithOrganizationAndTeam(users);
      const { team } = await orgOwner.getFirstTeamMembership();

      await doOnOrgDomain({ page, orgSlug }, async () => {
        await page.goto(`/team/${team.slug}`);

        // Expect the empty screen to be visible, indicating the profile is not accessible.
        await expect(page.getByTestId("empty-screen")).toBeVisible();

        // Ensure that the team name is not displayed.
        await expect(page.getByTestId("team-name")).toHaveCount(0);
      });
    });

    // TODO: Enable this test once the hydration error is fixed.
    test.skip("should be able to see team profile and book event with orgRedirection=true query param", async ({
      page,
      users,
    }) => {
      const orgOwner = await createUserWithOrganizationAndTeam(users);
      const { team } = await orgOwner.getFirstTeamMembership();

      await doOnOrgDomain({ page, orgSlug }, async () => {
        await page.goto(`/team/${team.slug}?orgRedirection=true`);

        // Verify that the team profile is visible.
        await expect(page.getByTestId("team-name")).toBeVisible();

        // Navigate to an event and ensure the page loads correctly.
        page.getByTestId("event-type-link").first().click();
        await page.waitForURL((url) => {
          return (
            url.searchParams.get("orgRedirection") === "true" && url.pathname.startsWith(`/${team.slug}/`)
          );
        });
        await expect(page.getByTestId("event-title")).toBeVisible();

        // Attempt to book the event.
        await bookEventOnThisPage(page);
      });
    });
  });

  test.describe("User Profile & Event Booking", () => {
    test("should not be able to see user profile by default", async ({ page, users }) => {
      const orgOwner = await createUserWithOrganizationAndTeam(users);

      await doOnOrgDomain({ page, orgSlug }, async () => {
        await page.goto(`/${orgOwner.username}`);

        // Expect the empty screen, indicating the profile is inaccessible.
        await expect(page.getByTestId("empty-screen")).toBeVisible();

        // Ensure user profile elements are not visible.
        await expect(page.locator('[data-testid="name-title"]')).toHaveCount(0);
        await expect(page.locator('[data-testid="event-types"]')).toHaveCount(0);
      });
    });

    test("should be able to see user profile and book event with orgRedirection=true query param", async ({
      page,
      users,
    }) => {
      const orgOwner = await createUserWithOrganizationAndTeam(users);

      await doOnOrgDomain({ page, orgSlug }, async () => {
        await page.goto(`/${orgOwner.username}?orgRedirection=true`);

        // Verify that the user profile is visible.
        await expect(page.locator('[data-testid="name-title"]')).toBeVisible();
        await expect(page.locator('[data-testid="event-types"]')).toBeVisible();

        // Navigate to an event and ensure the page loads correctly.
        page.getByTestId("event-type-link").first().click();
        await page.waitForURL((url) => {
          return (
            url.searchParams.get("orgRedirection") === "true" &&
            url.pathname.startsWith(`/${orgOwner.username}/`)
          );
        });
        await expect(page.getByTestId("event-title")).toBeVisible();

        // Attempt to book the event.
        await bookEventOnThisPage(page);
      });
    });
  });

  test.describe("Private Event URL Access", () => {
    test("should not be able to see private event by default", async ({ page, users, prisma }) => {
      const orgOwner = await createUserWithOrganizationAndTeam(users);
      const eventType = await orgOwner.getFirstEventAsOwner();

      // Create a private event with a hashed link.
      const privateEvent = await prisma.eventType.update({
        where: {
          id: eventType.id,
        },
        data: {
          hashedLink: {
            create: [
              {
                link: generateHashedLink(eventType.id),
              },
            ],
          },
        },
        include: {
          hashedLink: true,
        },
      });

      await doOnOrgDomain({ page, orgSlug }, async () => {
        await page.goto(`/d/${privateEvent.hashedLink[0]?.link}/${privateEvent.slug}`);

        // Expect the empty screen, indicating the event is inaccessible.
        await expect(page.getByTestId("empty-screen")).toBeVisible();
      });
    });

    test("should be able to see and book private event with orgRedirection=true query param", async ({
      page,
      users,
      prisma,
    }) => {
      const orgOwner = await createUserWithOrganizationAndTeam(users);
      const eventType = await orgOwner.getFirstEventAsOwner();

      // Create a private event with a hashed link.
      const privateEvent = await prisma.eventType.update({
        where: {
          id: eventType.id,
        },
        data: {
          hashedLink: {
            create: [
              {
                link: generateHashedLink(eventType.id),
              },
            ],
          },
        },
        include: {
          hashedLink: true,
        },
      });

      await doOnOrgDomain({ page, orgSlug }, async () => {
        await page.goto(`/d/${privateEvent.hashedLink[0]?.link}/${privateEvent.slug}?orgRedirection=true`);

        // Verify that the event page is visible.
        await expect(page.getByTestId("event-title")).toBeVisible();

        // Attempt to book the event.
        await bookEventOnThisPage(page);
      });
    });
  });
});
