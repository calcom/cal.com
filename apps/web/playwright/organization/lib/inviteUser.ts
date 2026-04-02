import type { Page } from "@playwright/test";
import type { createUsersFixture } from "playwright/fixtures/users";
import { submitAndWaitForResponse } from "../../lib/testUtils";

export const inviteUserToOrganization = async ({
  page,
  organizationId,
  organizationSlug,
  email,
  usersFixture,
}: {
  page: Page;
  organizationId: number;
  organizationSlug: string | null;
  email: string;
  usersFixture: ReturnType<typeof createUsersFixture>;
}) => {
  await page.goto(`/settings/organizations/${organizationSlug}/members`);
  const invitedUserEmail = usersFixture.trackEmail({
    username: email.split("@")[0],
    domain: email.split("@")[1],
  });
  await inviteAnEmail(page, invitedUserEmail);
  return { invitedUserEmail };
};

export const inviteExistingUserToOrganization = async ({
  page,
  organizationId,
  organizationSlug,
  user,
  usersFixture,
}: {
  page: Page;
  organizationId: number;
  organizationSlug: string | null;
  user: {
    email: string;
  };
  usersFixture: ReturnType<typeof createUsersFixture>;
}) => {
  await page.goto(`/settings/organizations/${organizationSlug}/members`);
  await inviteAnEmail(page, user.email);
  return { invitedUserEmail: user.email };
};

export async function acceptTeamOrOrgInvite(page: Page) {
  await page.goto("/settings/teams");
  await submitAndWaitForResponse(page, "/api/trpc/teams/acceptOrLeave?batch=1", {
    action: () => page.click('[data-testid^="accept-invitation"]'),
  });
}

async function inviteAnEmail(page: Page, invitedUserEmail: string) {
  await page.getByTestId("new-organization-member-button").click();
  await page.locator('input[name="inviteUser"]').fill(invitedUserEmail);
  await submitAndWaitForResponse(page, "/api/trpc/teams/inviteMember?batch=1", {
    action: () => page.getByTestId("invite-new-member-button").click(),
  });
}
