import type { DirectorySyncEvent } from "@boxyhq/saml-jackson";
import prisma from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import { afterEach, describe, expect, it } from "vitest";
import handleGroupEvents from "./handleGroupEvents";

let createdTeamIds: number[] = [];
let createdUserIds: number[] = [];
let createdEventTypeIds: number[] = [];
let createdDirectoryIds: string[] = [];

const uniqueSuffix = () => `${Date.now()}-${Math.random().toString(36).substring(7)}`;

const createOrg = async () => {
  const suffix = uniqueSuffix();
  const org = await prisma.team.create({
    data: {
      name: `Test Org ${suffix}`,
      slug: `test-org-${suffix}`,
      isOrganization: true,
    },
  });
  createdTeamIds.push(org.id);

  await prisma.organizationSettings.create({
    data: {
      organizationId: org.id,
      orgAutoAcceptEmail: "example.com",
    },
  });

  return org;
};

const createTeamInOrg = async (orgId: number) => {
  const suffix = uniqueSuffix();
  const team = await prisma.team.create({
    data: {
      name: `Test Team ${suffix}`,
      slug: `test-team-${suffix}`,
      parentId: orgId,
    },
  });
  createdTeamIds.push(team.id);
  return team;
};

const createUser = async (email?: string) => {
  const suffix = uniqueSuffix();
  const user = await prisma.user.create({
    data: {
      email: email ?? `test-user-${suffix}@example.com`,
      username: `testuser-${suffix}`,
      name: "Test User",
    },
  });
  createdUserIds.push(user.id);
  return user;
};

const createDSyncDirectory = async (directoryId: string, organizationId: number) => {
  createdDirectoryIds.push(directoryId);
  return prisma.dSyncData.create({
    data: { directoryId, tenant: "test-tenant", organizationId },
  });
};

const createDSyncGroupMapping = async ({
  directoryId,
  groupName,
  teamId,
  organizationId,
}: {
  directoryId: string;
  groupName: string;
  teamId: number;
  organizationId: number;
}) => {
  return prisma.dSyncTeamGroupMapping.create({
    data: { directoryId, groupName, teamId, organizationId },
  });
};

const createManagedEventType = async ({
  teamId,
  slug,
  title,
}: {
  teamId: number;
  slug: string;
  title: string;
}) => {
  const eventType = await prisma.eventType.create({
    data: {
      title,
      slug,
      length: 30,
      locations: [],
      teamId,
      schedulingType: SchedulingType.MANAGED,
      assignAllTeamMembers: true,
    },
  });
  createdEventTypeIds.push(eventType.id);
  return eventType;
};

const createPersonalEventType = async ({
  userId,
  slug,
  title,
}: {
  userId: number;
  slug: string;
  title: string;
}) => {
  const eventType = await prisma.eventType.create({
    data: { title, slug, length: 30, userId },
  });
  createdEventTypeIds.push(eventType.id);
  return eventType;
};

const buildGroupEvent = ({
  directoryId,
  groupName,
  memberEmails,
}: {
  directoryId: string;
  groupName: string;
  memberEmails: string[];
}): DirectorySyncEvent =>
  ({
    event: "group.user_added",
    tenant: "test-tenant",
    product: "test-product",
    directory_id: directoryId,
    data: {
      id: `group-${uniqueSuffix()}`,
      name: groupName,
      raw: {
        members: memberEmails.map((email) => ({ value: email, display: email })),
      },
    },
  }) as DirectorySyncEvent;

const findManagedChild = (userId: number, parentId: number) =>
  prisma.eventType.findFirst({
    where: { userId, parentId },
    select: { id: true, slug: true },
  });

const findEventTypeById = (id: number) =>
  prisma.eventType.findUnique({
    where: { id },
    select: { id: true },
  });

const findEventTypeDetails = (id: number) =>
  prisma.eventType.findUnique({
    where: { id },
    select: { id: true, slug: true, hidden: true, title: true },
  });

const setupOrgWithDSyncGroup = async () => {
  const org = await createOrg();
  const team = await createTeamInOrg(org.id);
  const user = await createUser();
  const directoryId = `dir-${uniqueSuffix()}`;
  const groupName = "Engineering";

  await createDSyncDirectory(directoryId, org.id);
  await createDSyncGroupMapping({ directoryId, groupName, teamId: team.id, organizationId: org.id });

  return { org, team, user, directoryId, groupName };
};

const cleanup = async () => {
  if (createdEventTypeIds.length > 0) {
    await prisma.eventType.deleteMany({
      where: { parentId: { in: createdEventTypeIds } },
    });
  }

  if (createdUserIds.length > 0) {
    await prisma.eventType.deleteMany({
      where: { userId: { in: createdUserIds }, teamId: null },
    });
  }

  if (createdTeamIds.length > 0) {
    await prisma.host.deleteMany({
      where: { eventType: { teamId: { in: createdTeamIds } } },
    });
    await prisma.eventType.deleteMany({
      where: { teamId: { in: createdTeamIds } },
    });
  }

  if (createdDirectoryIds.length > 0) {
    await prisma.dSyncTeamGroupMapping.deleteMany({
      where: { directoryId: { in: createdDirectoryIds } },
    });
    await prisma.dSyncData.deleteMany({
      where: { directoryId: { in: createdDirectoryIds } },
    });
  }

  if (createdTeamIds.length > 0) {
    await prisma.membership.deleteMany({
      where: { teamId: { in: createdTeamIds } },
    });
  }

  if (createdUserIds.length > 0) {
    await prisma.profile.deleteMany({
      where: { userId: { in: createdUserIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });
  }

  if (createdTeamIds.length > 0) {
    await prisma.organizationSettings.deleteMany({
      where: { organizationId: { in: createdTeamIds } },
    });
    await prisma.team.deleteMany({
      where: { id: { in: createdTeamIds } },
    });
  }

  createdTeamIds = [];
  createdUserIds = [];
  createdEventTypeIds = [];
  createdDirectoryIds = [];
};

describe("handleGroupEvents – managed event type slug conflict resolution", () => {
  afterEach(cleanup);

  it("should rename and hide a personal event type whose slug conflicts with a managed event type", async () => {
    const { team, user, directoryId, groupName } = await setupOrgWithDSyncGroup();

    const managedParent = await createManagedEventType({
      teamId: team.id,
      slug: "consultation",
      title: "Consultation",
    });
    const personal = await createPersonalEventType({
      userId: user.id,
      slug: "consultation",
      title: "My Consultation",
    });

    await handleGroupEvents(buildGroupEvent({ directoryId, groupName, memberEmails: [user.email] }), team.parentId!);

    const child = await findManagedChild(user.id, managedParent.id);
    expect(child).not.toBeNull();
    expect(child?.slug).toBe("consultation");

    const renamedPersonal = await findEventTypeDetails(personal.id);
    expect(renamedPersonal).not.toBeNull();
    expect(renamedPersonal!.slug).toBe(`consultation-personal-${personal.id}`);
    expect(renamedPersonal!.hidden).toBe(true);
    expect(renamedPersonal!.title).toBe("My Consultation [Personal]");
  });

  it("should create managed event type normally when no slug conflict exists", async () => {
    const { team, user, directoryId, groupName } = await setupOrgWithDSyncGroup();

    const managedParent = await createManagedEventType({
      teamId: team.id,
      slug: "consultation",
      title: "Consultation",
    });

    await handleGroupEvents(buildGroupEvent({ directoryId, groupName, memberEmails: [user.email] }), team.parentId!);

    const child = await findManagedChild(user.id, managedParent.id);
    expect(child).not.toBeNull();
    expect(child?.slug).toBe("consultation");
  });

  it("should preserve non-conflicting personal event types while renaming and hiding conflicting ones", async () => {
    const { team, user, directoryId, groupName } = await setupOrgWithDSyncGroup();

    const managedParent = await createManagedEventType({
      teamId: team.id,
      slug: "consultation",
      title: "Consultation",
    });
    const conflicting = await createPersonalEventType({
      userId: user.id,
      slug: "consultation",
      title: "My Consultation",
    });
    const unrelated = await createPersonalEventType({
      userId: user.id,
      slug: "my-other-event",
      title: "My Other Event",
    });

    await handleGroupEvents(buildGroupEvent({ directoryId, groupName, memberEmails: [user.email] }), team.parentId!);

    const child = await findManagedChild(user.id, managedParent.id);
    expect(child).not.toBeNull();

    const renamedConflicting = await findEventTypeDetails(conflicting.id);
    expect(renamedConflicting).not.toBeNull();
    expect(renamedConflicting!.slug).toBe(`consultation-personal-${conflicting.id}`);
    expect(renamedConflicting!.hidden).toBe(true);
    expect(renamedConflicting!.title).toBe("My Consultation [Personal]");

    expect(await findEventTypeById(unrelated.id)).not.toBeNull();
  });
});
