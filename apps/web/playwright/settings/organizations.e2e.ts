import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { expect } from "@playwright/test";
import { test } from "../lib/fixtures";

test.describe.configure({ mode: "serial" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Organization Settings", () => {
  test("owner can create an organization", async ({ page, users }) => {
    const owner = await users.create({ name: "Org Owner" });
    const slug = `astoria-it-${Date.now()}`;
    await owner.apiLogin();

    await page.goto("/settings/organizations/general");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("org-name-input").fill("Astoria IT");
    await page.getByTestId("org-slug-input").fill(slug);
    await page.getByTestId("org-submit-btn").click();

    await expect(page.getByText(/settings updated/i)).toBeVisible();

    const org = await prisma.team.findFirst({
      where: { slug, isOrganization: true },
    });
    expect(org).not.toBeNull();

    if (org) {
      await prisma.team.delete({ where: { id: org.id } });
    }
  });

  test("owner sees members page with self listed", async ({ page, users, orgs }) => {
    const owner = await users.create({ name: "Org Owner" });
    const org = await orgs.create({ name: "Test Org", slug: `test-org-${Date.now()}` });

    await prisma.membership.create({
      data: {
        userId: owner.id,
        teamId: org.id,
        role: MembershipRole.OWNER,
        accepted: true,
      },
    });
    await prisma.user.update({
      where: { id: owner.id },
      data: { organizationId: org.id },
    });

    await owner.apiLogin();
    await page.goto("/settings/organizations/members");
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("invite-member-btn")).toBeVisible();
    await expect(page.getByText(owner.name ?? owner.username ?? "")).toBeVisible();
  });

  test("owner can invite existing member and member sees pending invite", async ({
    page,
    users,
    orgs,
    browser,
  }) => {
    const owner = await users.create({ name: "Org Owner" });
    const invitee = await users.create({ name: "Invitee User" });
    const org = await orgs.create({ name: "Invite Test Org", slug: `invite-org-${Date.now()}` });

    await prisma.membership.create({
      data: {
        userId: owner.id,
        teamId: org.id,
        role: MembershipRole.OWNER,
        accepted: true,
      },
    });
    await prisma.user.update({
      where: { id: owner.id },
      data: { organizationId: org.id },
    });

    await owner.apiLogin();
    await page.goto("/settings/organizations/members");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("invite-member-btn").click();
    await page.getByTestId("invite-email-input").fill(invitee.email);
    await page.getByTestId("send-invite-btn").click();

    await expect(page.getByText("Invite sent.")).toBeVisible();

    // Verify pending membership created
    const membership = await prisma.membership.findUnique({
      where: { userId_teamId: { userId: invitee.id, teamId: org.id } },
    });
    expect(membership).not.toBeNull();
    expect(membership?.accepted).toBe(false);

    // Invitee sees the invite
    const [inviteeContext, inviteePage] = await invitee.apiLoginOnNewBrowser(browser);
    await inviteePage.goto("/settings/organizations/invites");
    await inviteePage.waitForLoadState("networkidle");

    await expect(inviteePage.getByTestId(`invite-item-${org.id}`)).toBeVisible();
    await inviteeContext.close();
  });

  test("invitee can accept an org invite", async ({ page, users, orgs }) => {
    const owner = await users.create({ name: "Org Owner" });
    const invitee = await users.create({ name: "Invitee User" });
    const org = await orgs.create({ name: "Accept Test Org", slug: `accept-org-${Date.now()}` });

    // Set up org membership for owner
    await prisma.membership.create({
      data: { userId: owner.id, teamId: org.id, role: MembershipRole.OWNER, accepted: true },
    });
    await prisma.user.update({ where: { id: owner.id }, data: { organizationId: org.id } });

    // Create pending invite
    await prisma.membership.create({
      data: { userId: invitee.id, teamId: org.id, role: MembershipRole.MEMBER, accepted: false },
    });

    await invitee.apiLogin();
    await page.goto("/settings/organizations/invites");
    await page.waitForLoadState("networkidle");

    await page.getByTestId(`accept-invite-${org.id}`).click();

    // Should redirect to org settings after accept
    await page.waitForURL(/\/settings\/organizations\/general/);

    const membership = await prisma.membership.findUnique({
      where: { userId_teamId: { userId: invitee.id, teamId: org.id } },
    });
    expect(membership?.accepted).toBe(true);
  });

  test("invitee can decline an org invite", async ({ page, users, orgs }) => {
    const invitee = await users.create({ name: "Invitee User" });
    const org = await orgs.create({ name: "Decline Test Org", slug: `decline-org-${Date.now()}` });

    await prisma.membership.create({
      data: { userId: invitee.id, teamId: org.id, role: MembershipRole.MEMBER, accepted: false },
    });

    await invitee.apiLogin();
    await page.goto("/settings/organizations/invites");
    await page.waitForLoadState("networkidle");

    await page.getByTestId(`decline-invite-${org.id}`).click();

    await expect(page.getByText("Invite declined.")).toBeVisible();

    const membership = await prisma.membership.findUnique({
      where: { userId_teamId: { userId: invitee.id, teamId: org.id } },
    });
    expect(membership).toBeNull();
  });

  test("owner can remove a member", async ({ page, users, orgs }) => {
    const owner = await users.create({ name: "Org Owner" });
    const member = await users.create({ name: "Regular Member" });
    const org = await orgs.create({ name: "Remove Test Org", slug: `remove-org-${Date.now()}` });

    await prisma.membership.create({
      data: { userId: owner.id, teamId: org.id, role: MembershipRole.OWNER, accepted: true },
    });
    await prisma.membership.create({
      data: { userId: member.id, teamId: org.id, role: MembershipRole.MEMBER, accepted: true },
    });
    await prisma.user.update({ where: { id: owner.id }, data: { organizationId: org.id } });

    await owner.apiLogin();
    await page.goto("/settings/organizations/members");
    await page.waitForLoadState("networkidle");

    await page.getByTestId(`remove-member-${member.id}`).click();

    await expect(page.getByText("Member removed.")).toBeVisible();

    const membership = await prisma.membership.findUnique({
      where: { userId_teamId: { userId: member.id, teamId: org.id } },
    });
    expect(membership).toBeNull();
  });
});
