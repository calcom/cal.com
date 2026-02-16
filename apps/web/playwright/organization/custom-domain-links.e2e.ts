import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { generateHashedLink } from "@calcom/lib/generateHashedLink";
import { prisma } from "@calcom/prisma";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";
import { expect } from "@playwright/test";

import { test } from "../lib/fixtures";
import { bookEventOnThisPage, doOnOrgDomain } from "../lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.describe("Custom Domain - Internal Links", () => {
  test.afterEach(({ orgs, users }) => {
    orgs.deleteAll();
    users.deleteAll();
  });

  async function setupOrgWithCustomDomain(orgs: any) {
    const org = await orgs.create({ name: "TestOrg" });
    const customDomainSlug = `booking-${Math.random().toString(36).substring(7)}.testorg.com`;
    await prisma.customDomain.create({
      data: { teamId: org.id, slug: customDomainSlug, verified: true },
    });
    const customDomainOrigin = getOrgFullOrigin(customDomainSlug, { isCustomDomain: true });
    return { org, customDomainSlug, customDomainOrigin };
  }

  test("User event type page: avatar links point to custom domain", async ({ page, users, orgs }) => {
    const { org, customDomainSlug } = await setupOrgWithCustomDomain(orgs);

    const user = await users.create({
      username: "org-member",
      organizationId: org.id,
      roleInOrganization: MembershipRole.MEMBER,
    });
    const eventType = await user.getFirstEventAsOwner();

    await doOnOrgDomain({ page, orgSlug: customDomainSlug }, async () => {
      await page.goto(`/${user.username}/${eventType.slug}`);
      await expect(page.getByTestId("event-title")).toBeVisible();

      await page.waitForSelector('[data-testid="avatar-href"]');
      const avatarLinks = page.locator('[data-testid="avatar-href"]');
      const count = await avatarLinks.count();
      expect(count).toBeGreaterThanOrEqual(1);
      for (let i = 0; i < count; i++) {
        const href = await avatarLinks.nth(i).getAttribute("href");
        expect(href).toContain(customDomainSlug);
      }
    });
  });

  test("Team profile page: member links point to custom domain", async ({ page, users, orgs }) => {
    const { org, customDomainSlug } = await setupOrgWithCustomDomain(orgs);

    const owner = await users.create(
      {
        username: "org-owner",
        roleInOrganization: MembershipRole.OWNER,
        organizationId: org.id,
      },
      { hasTeam: true }
    );
    const { team } = await owner.getFirstTeamMembership();

    await doOnOrgDomain({ page, orgSlug: customDomainSlug }, async () => {
      await page.goto(`/team/${team.slug}?members=1`);
      await expect(page.getByTestId("team-name")).toBeVisible();

      const memberLinks = page.locator('a[href*="/' + owner.username + '"]');
      const count = await memberLinks.count();
      expect(count).toBeGreaterThanOrEqual(1);
      for (let i = 0; i < count; i++) {
        const href = await memberLinks.nth(i).getAttribute("href");
        expect(href).toContain(customDomainSlug);
      }
    });
  });

  test("Team event type page: avatar links point to custom domain", async ({ page, users, orgs }) => {
    const { org, customDomainSlug } = await setupOrgWithCustomDomain(orgs);

    const owner = await users.create(
      {
        username: "org-owner",
        roleInOrganization: MembershipRole.OWNER,
        organizationId: org.id,
      },
      {
        hasTeam: true,
        teammates: [{ name: "teammate-1", organizationId: org.id, roleInOrganization: MembershipRole.MEMBER }],
        schedulingType: SchedulingType.COLLECTIVE,
      }
    );
    const { team } = await owner.getFirstTeamMembership();
    const teamEvent = await owner.getFirstTeamEvent(team.id);

    await doOnOrgDomain({ page, orgSlug: customDomainSlug }, async () => {
      await page.goto(`/team/${team.slug}/${teamEvent.slug}`);
      await expect(page.getByTestId("event-title")).toBeVisible();

      await page.waitForSelector('[data-testid="avatar-href"]');
      const avatarLinks = page.locator('[data-testid="avatar-href"]');
      const count = await avatarLinks.count();
      expect(count).toBeGreaterThanOrEqual(1);
      for (let i = 0; i < count; i++) {
        const href = await avatarLinks.nth(i).getAttribute("href");
        expect(href).toContain(customDomainSlug);
      }
    });
  });

  test("Hashed link page: loads and can book on custom domain", async ({ page, users, orgs, prisma: prismaMock }) => {
    const { org, customDomainSlug } = await setupOrgWithCustomDomain(orgs);

    const user = await users.create({
      username: "org-member",
      organizationId: org.id,
      roleInOrganization: MembershipRole.MEMBER,
    });
    const eventType = await user.getFirstEventAsOwner();

    const privateEvent = await prismaMock.eventType.update({
      where: { id: eventType.id },
      data: {
        hashedLink: {
          create: [{ link: generateHashedLink(eventType.id) }],
        },
      },
      include: { hashedLink: true },
    });

    await doOnOrgDomain({ page, orgSlug: customDomainSlug }, async () => {
      await page.goto(`/d/${privateEvent.hashedLink[0]?.link}/${privateEvent.slug}`);
      await expect(page.getByTestId("event-title")).toBeVisible();
      await bookEventOnThisPage(page);
    });
  });

  test("Dynamic group page: avatar links point to custom domain", async ({ page, users, orgs }) => {
    const { org, customDomainSlug } = await setupOrgWithCustomDomain(orgs);

    const user1 = await users.create({
      username: "org-member-1",
      organizationId: org.id,
      roleInOrganization: MembershipRole.MEMBER,
    });
    const user2 = await users.create({
      username: "org-member-2",
      organizationId: org.id,
      roleInOrganization: MembershipRole.MEMBER,
    });

    await doOnOrgDomain({ page, orgSlug: customDomainSlug }, async () => {
      await page.goto(`/${user1.username}+${user2.username}`);
      await page.locator('[data-testid="day"][data-disabled="false"]').nth(0).waitFor({ state: "visible" });

      await page.waitForSelector('[data-testid="avatar-href"]');
      const avatarLinks = page.locator('[data-testid="avatar-href"]');
      const count = await avatarLinks.count();
      expect(count).toBeGreaterThanOrEqual(2);
      for (let i = 0; i < count; i++) {
        const href = await avatarLinks.nth(i).getAttribute("href");
        expect(href).toContain(customDomainSlug);
      }
    });
  });
});
