import type { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import type { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import type { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import type { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";

import type { Prisma } from "@calcom/prisma/client";
import type { Team, User, Membership } from "@calcom/prisma/client";

export const DEFAULT_BIO = "I am a bio";
export const DEFAULT_METADATA: Prisma.InputJsonValue = { foo: "bar" };

type Fixtures = {
  user: UserRepositoryFixture;
  profile: ProfileRepositoryFixture;
  membership: MembershipRepositoryFixture;
};

type CreateUserData = {
  email: string;
  username?: string;
  bio?: string;
  metadata?: Prisma.InputJsonValue;
};

export async function createOrgUser(
  fixtures: Fixtures,
  org: Team,
  data: CreateUserData,
  role: "MEMBER" | "ADMIN" | "OWNER" = "MEMBER"
): Promise<{ user: User; membership: Membership }> {
  const username = data.username ?? data.email;

  const user = await fixtures.user.create({
    email: data.email,
    username,
    organization: { connect: { id: org.id } },
    bio: data.bio ?? DEFAULT_BIO,
    metadata: data.metadata ?? DEFAULT_METADATA,
  });

  await fixtures.profile.create({
    uid: `usr-${user.id}`,
    username,
    organization: { connect: { id: org.id } },
    user: { connect: { id: user.id } },
  });

  const membership = await fixtures.membership.addUserToOrg(user, org, role, true);
  return { user, membership };
}

export async function cleanupOrgTest(
  fixtures: { user: UserRepositoryFixture; organization: OrganizationRepositoryFixture },
  emails: (string | undefined)[],
  orgId?: number
): Promise<void> {
  const validEmails = emails.filter((e): e is string => !!e);
  await Promise.all(validEmails.map((email) => fixtures.user.deleteByEmail(email)));

  if (orgId) {
    await fixtures.organization.delete(orgId);
  }
}
