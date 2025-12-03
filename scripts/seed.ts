import { uuid } from "short-uuid";
import type z from "zod";

import dailyMeta from "@calcom/app-store/dailyvideo/_metadata";
import googleMeetMeta from "@calcom/app-store/googlevideo/_metadata";
import zoomMeta from "@calcom/app-store/zoomvideo/_metadata";
import dayjs from "@calcom/dayjs";
import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import { hashPassword } from "@calcom/lib/auth/hashPassword";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { prisma } from "@calcom/prisma";
import type { Membership, Team, User, UserPermissionRole } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";
import { BookingStatus, MembershipRole, RedirectType, SchedulingType } from "@calcom/prisma/enums";
import type { Ensure } from "@calcom/types/utils";

import type { teamMetadataSchema } from "../packages/prisma/zod-utils";
import mainAppStore from "./seed-app-store";
import mainHugeEventTypesSeed from "./seed-huge-event-types";
import { createUserAndEventType } from "./seed-utils";

type PlatformUser = {
  email: string;
  password: string;
  username: string;
  name: string;
  completedOnboarding?: boolean;
  timeZone?: string;
  role?: UserPermissionRole;
  theme?: "dark" | "light";
  avatarUrl?: string | null;
};

type AssociateUserAndOrgProps = {
  teamId: number;
  userId: number;
  role: MembershipRole;
  username: string;
};

const checkUnpublishedTeam = async (slug: string) => {
  return await prisma.team.findFirst({
    where: {
      metadata: {
        path: ["requestedSlug"],
        equals: slug,
      },
    },
  });
};

const setupPlatformUser = async (user: PlatformUser) => {
  const { password: _password, ...restOfUser } = user;
  const userData = {
    ...restOfUser,
    emailVerified: new Date(),
    completedOnboarding: user.completedOnboarding ?? true,
    locale: "en",
    schedules:
      user.completedOnboarding ?? true
        ? {
            create: {
              name: "Working Hours",
              availability: {
                createMany: {
                  data: getAvailabilityFromSchedule(DEFAULT_SCHEDULE),
                },
              },
            },
          }
        : undefined,
  };

  const platformUser = await prisma.user.upsert({
    where: { email_username: { email: user.email, username: user.username } },
    update: userData,
    create: userData,
  });

  await prisma.userPassword.upsert({
    where: { userId: platformUser.id },
    update: {
      hash: await hashPassword(user.password),
    },
    create: {
      hash: await hashPassword(user.password),
      user: {
        connect: {
          id: platformUser.id,
        },
      },
    },
  });

  return platformUser;
};

const createTeam = async (team: Prisma.TeamCreateInput) => {
  try {
    const requestedSlug = (team.metadata as z.infer<typeof teamMetadataSchema>)?.requestedSlug;
    if (requestedSlug) {
      const unpublishedTeam = await checkUnpublishedTeam(requestedSlug);
      if (unpublishedTeam) {
        throw Error("Unique constraint failed on the fields");
      }
    }
    return await prisma.team.create({
      data: {
        ...team,
      },
    });
  } catch (_err) {
    if (_err instanceof Error && _err.message.indexOf("Unique constraint failed on the fields") !== -1) {
      console.log(`Team '${team.name}' already exists, skipping.`);
      return;
    }
    throw _err;
  }
};

const associateUserAndOrg = async ({ teamId, userId, role, username }: AssociateUserAndOrgProps) => {
  await prisma.membership.create({
    data: {
      createdAt: new Date(),
      teamId,
      userId,
      role: role as MembershipRole,
      accepted: true,
    },
  });

  const profile = await prisma.profile.create({
    data: {
      uid: uuid(),
      username,
      organizationId: teamId,
      userId,
    },
  });

  await prisma.user.update({
    data: {
      movedToProfileId: profile.id,
    },
    where: {
      id: userId,
    },
  });
};

async function createPlatformAndSetupUser({
  teamInput,
  user,
}: {
  teamInput: Prisma.TeamCreateInput;
  user: PlatformUser;
}) {
  const team = await createTeam(teamInput);

  const platformUser = await setupPlatformUser(user);

  console.log(
    `👤 Upserted '${user.username}' with email "${user.email}" & password "${user.password}". Booking page 👉 ${process.env.NEXT_PUBLIC_WEBAPP_URL}/${user.username}`
  );

  const { username } = platformUser;

  const membershipRole = MembershipRole.OWNER;

  if (!!team) {
    await associateUserAndOrg({
      teamId: team.id,
      userId: platformUser.id,
      role: membershipRole,
      username: user.username,
    });

    await prisma.platformBilling.create({
      data: {
        id: team?.id,
        plan: "SCALE",
        customerId: "cus_123",
        subscriptionId: "sub_123",
      },
    });

    const clientId = process.env.SEED_PLATFORM_OAUTH_CLIENT_ID;
    const secret = process.env.SEED_PLATFORM_OAUTH_CLIENT_SECRET;

    if (clientId && secret) {
      await prisma.platformOAuthClient.create({
        data: {
          name: "Acme",
          redirectUris: ["http://localhost:4321"],
          permissions: 1023,
          areEmailsEnabled: true,
          organizationId: team.id,
          id: clientId,
          secret,
        },
      });
    }
    console.log(`\t👤 Added '${teamInput.name}' membership for '${username}' with role '${membershipRole}'`);
  }
}

async function createTeamAndAddUsers(
  teamInput: Prisma.TeamCreateInput,
  users: { id: number; username: string; role?: MembershipRole }[] = []
) {
  const checkUnpublishedTeam = async (slug: string) => {
    return await prisma.team.findFirst({
      where: {
        metadata: {
          path: ["requestedSlug"],
          equals: slug,
        },
      },
    });
  };
  const createTeam = async (team: Prisma.TeamCreateInput) => {
    try {
      const requestedSlug = (team.metadata as z.infer<typeof teamMetadataSchema>)?.requestedSlug;
      if (requestedSlug) {
        const unpublishedTeam = await checkUnpublishedTeam(requestedSlug);
        if (unpublishedTeam) {
          throw Error("Unique constraint failed on the fields");
        }
      }
      return await prisma.team.create({
        data: {
          ...team,
        },
      });
    } catch (_err) {
      if (_err instanceof Error && _err.message.indexOf("Unique constraint failed on the fields") !== -1) {
        console.log(`Team '${team.name}' already exists, skipping.`);
        return;
      }
      throw _err;
    }
  };

  const team = await createTeam(teamInput);
  if (!team) {
    return;
  }

  console.log(
    `🏢 Created team '${teamInput.name}' - ${process.env.NEXT_PUBLIC_WEBAPP_URL}/team/${team.slug}`
  );

  for (const user of users) {
    const { role = MembershipRole.OWNER, id, username } = user;
    await prisma.membership.create({
      data: {
        createdAt: new Date(),
        teamId: team.id,
        userId: id,
        role: role,
        accepted: true,
      },
    });
    console.log(`\t👤 Added '${teamInput.name}' membership for '${username}' with role '${role}'`);
  }

  return team;
}

async function createOrganizationAndAddMembersAndTeams({
  org: { orgData, members: orgMembers },
  teams,
  usersOutsideOrg,
}: {
  org: {
    orgData: Ensure<Partial<Prisma.TeamCreateInput>, "name" | "slug"> & {
      organizationSettings: Prisma.OrganizationSettingsCreateWithoutOrganizationInput;
    };
    members: {
      memberData: Ensure<Partial<Prisma.UserCreateInput>, "username" | "name" | "email" | "password">;
      orgMembership: Partial<Membership>;
      orgProfile: {
        username: string;
      };
      inTeams: { slug: string; role: MembershipRole }[];
    }[];
  };
  teams: {
    teamData: Omit<Ensure<Partial<Prisma.TeamCreateInput>, "name" | "slug">, "members">;
    nonOrgMembers: Ensure<Partial<Prisma.UserCreateInput>, "username" | "name" | "email" | "password">[];
  }[];
  usersOutsideOrg: {
    name: string;
    username: string;
    email: string;
  }[];
}) {
  console.log(`\n🏢 Creating organization "${orgData.name}"`);

  const existingTeam = await prisma.team.findFirst({
    where: {
      slug: orgData.slug,
      parentId: null,
    },
  });

  if (existingTeam) {
    console.log(`Organization with slug '${orgData.slug}' already exists, skipping.`);
    return;
  }

  const orgMembersInDb: (User & {
    inTeams: { slug: string; role: MembershipRole }[];
    orgMembership: Partial<Membership>;
    orgProfile: {
      username: string;
    };
  })[] = [];

  try {
    const batchSize = 50;
    // Process members in batches of  in parallel
    for (let i = 0; i < orgMembers.length; i += batchSize) {
      const batch = orgMembers.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (member) => {
          const newUser = await createUserAndEventType({
            user: {
              ...member.memberData,
              theme:
                member.memberData.theme === "dark" || member.memberData.theme === "light"
                  ? member.memberData.theme
                  : undefined,
              password: member.memberData.password.create?.hash ?? "",
            },
            eventTypes: [
              {
                title: "30min",
                slug: "30min",
                length: 30,
                _bookings: [
                  {
                    uid: uuid(),
                    title: "30min",
                    startTime: dayjs().add(1, "day").toDate(),
                    endTime: dayjs().add(1, "day").add(30, "minutes").toDate(),
                  },
                ],
              },
            ],
          });

          const orgMemberInDb = {
            ...newUser,
            inTeams: member.inTeams,
            orgMembership: member.orgMembership,
            orgProfile: member.orgProfile,
          };

          // Create temp org redirect with upsert to handle duplicates
          await prisma.tempOrgRedirect.upsert({
            where: {
              from_type_fromOrgId: {
                from: member.memberData.username,
                type: RedirectType.User,
                fromOrgId: 0,
              },
            },
            update: {
              toUrl: `${getOrgFullOrigin(orgData.slug)}/${member.orgProfile.username}`,
            },
            create: {
              fromOrgId: 0,
              type: RedirectType.User,
              from: member.memberData.username,
              toUrl: `${getOrgFullOrigin(orgData.slug)}/${member.orgProfile.username}`,
            },
          });

          return orgMemberInDb;
        })
      );

      orgMembersInDb.push(...batchResults);
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        console.log(`One of the organization members already exists, skipping the entire seeding`);
        return;
      }
    }
    console.error(e);
  }

  await Promise.all([
    usersOutsideOrg.map(async (user) => {
      return await prisma.user.create({
        data: {
          username: user.username,
          name: user.name,
          email: user.email,
          emailVerified: new Date(),
          password: {
            create: {
              hash: await hashPassword(user.username),
            },
          },
        },
      });
    }),
  ]);

  const { organizationSettings, ...restOrgData } = orgData;

  // Create organization with those users as members
  const orgInDb = await prisma.team.create({
    data: {
      ...restOrgData,
      metadata: {
        ...(orgData.metadata && typeof orgData.metadata === "object" ? orgData.metadata : {}),
        isOrganization: true,
      },
      orgProfiles: {
        create: orgMembersInDb.map((member) => ({
          uid: uuid(),
          username: member.orgProfile.username,
          movedFromUser: {
            connect: {
              id: member.id,
            },
          },
          user: {
            connect: {
              id: member.id,
            },
          },
        })),
      },
      organizationSettings: {
        create: {
          ...organizationSettings,
        },
      },
      members: {
        create: orgMembersInDb.map((member) => ({
          user: {
            connect: {
              id: member.id,
            },
          },
          role: member.orgMembership.role || "MEMBER",
          accepted: member.orgMembership.accepted,
        })),
      },
    },
    select: {
      id: true,
      members: true,
      orgProfiles: true,
    },
  });

  const orgMembersInDBWithProfileId = await Promise.all(
    orgMembersInDb.map(async (member) => ({
      ...member,
      profile: {
        ...member.orgProfile,
        id: orgInDb.orgProfiles.find((p) => p.userId === member.id)?.id,
      },
    }))
  );

  // For each member create one event
  for (const member of orgMembersInDBWithProfileId) {
    await prisma.eventType.create({
      data: {
        title: `${member.name} Event`,
        slug: `${member.username}-event`,
        length: 15,
        owner: {
          connect: {
            id: member.id,
          },
        },
        profile: {
          connect: {
            id: member.profile.id,
          },
        },
        users: {
          connect: {
            id: member.id,
          },
        },
      },
    });

    // Create schedule for every member
    await prisma.schedule.create({
      data: {
        name: "Working Hours",
        userId: member.id,
        availability: {
          create: {
            days: [1, 2, 3, 4, 5],
            startTime: "1970-01-01T09:00:00.000Z",
            endTime: "1970-01-01T17:00:00.000Z",
          },
        },
      },
    });
  }

  const organizationTeams: Team[] = [];

  // Create all the teams in the organization
  for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
    const nonOrgMembers: User[] = [];
    const team = teams[teamIndex];
    for (const nonOrgMember of team.nonOrgMembers) {
      nonOrgMembers.push(
        await prisma.user.create({
          data: {
            ...nonOrgMember,
            password: {
              create: {
                hash: await hashPassword(nonOrgMember.username),
              },
            },
            emailVerified: new Date(),
          },
        })
      );
    }
    organizationTeams.push(
      await prisma.team.create({
        data: {
          ...team.teamData,
          parent: {
            connect: {
              id: orgInDb.id,
            },
          },
          metadata: team.teamData.metadata || {},
          members: {
            create: nonOrgMembers.map((member) => ({
              user: {
                connect: {
                  id: member.id,
                },
              },
              role: "MEMBER",
              accepted: true,
            })),
          },
        },
      })
    );

    const ownerForEvent = orgMembersInDBWithProfileId[0];
    if (!ownerForEvent) {
      console.log(
        `Warning: No organization members with profiles found for creating team event, skipping event creation for team ${team.teamData.slug}`
      );
      continue;
    }
    // Create event for each team
    await prisma.eventType.create({
      data: {
        title: `${team.teamData.name} Event 1`,
        slug: `${team.teamData.slug}-event-1`,
        schedulingType: SchedulingType.ROUND_ROBIN,
        length: 15,
        team: {
          connect: {
            id: organizationTeams[teamIndex].id,
          },
        },
        owner: {
          connect: {
            id: ownerForEvent.id,
          },
        },
        profile: {
          connect: {
            id: ownerForEvent.profile.id,
          },
        },
        users: {
          connect: {
            id: ownerForEvent.id,
          },
        },
      },
    });
  }

  // Create memberships for all the organization members with the respective teams
  for (const member of orgMembersInDBWithProfileId) {
    for (const { slug: teamSlug, role: role } of member.inTeams) {
      const team = organizationTeams.find((t) => t.slug === teamSlug);
      if (!team) {
        throw Error(`Team with slug ${teamSlug} not found`);
      }
      await prisma.membership.create({
        data: {
          createdAt: new Date(),
          teamId: team.id,
          userId: member.id,
          role: role,
          accepted: true,
        },
      });
    }
  }
}

async function main() {
  await createUserAndEventType({
    user: {
      email: "delete-me@example.com",
      password: "delete-me",
      username: "delete-me",
      name: "delete-me",
    },
  });

  await createUserAndEventType({
    user: {
      email: "onboarding@example.com",
      password: "onboarding",
      username: "onboarding",
      name: "onboarding",
      completedOnboarding: false,
    },
  });

  await createUserAndEventType({
    user: {
      email: "free-first-hidden@example.com",
      password: "free-first-hidden",
      username: "free-first-hidden",
      name: "Free First Hidden Example",
    },
    eventTypes: [
      {
        title: "30min",
        slug: "30min",
        length: 30,
        hidden: true,
      },
      {
        title: "60min",
        slug: "60min",
        length: 30,
      },
    ],
  });

  await createUserAndEventType({
    user: {
      email: "pro@example.com",
      name: "Pro Example",
      password: "pro",
      username: "pro",
      theme: "light",
    },
    eventTypes: [
      {
        title: "30min",
        slug: "30min",
        length: 30,
        _bookings: [
          {
            uid: uuid(),
            title: "30min",
            startTime: dayjs().add(1, "day").toDate(),
            endTime: dayjs().add(1, "day").add(30, "minutes").toDate(),
          },
          {
            uid: uuid(),
            title: "30min",
            startTime: dayjs().add(2, "day").toDate(),
            endTime: dayjs().add(2, "day").add(30, "minutes").toDate(),
            status: BookingStatus.PENDING,
          },
          {
            // hardcode UID so that we can easily test rescheduling in embed
            uid: "qm3kwt3aTnVD7vmP9tiT2f",
            title: "30min Seeded Booking",
            startTime: dayjs().add(3, "day").toDate(),
            endTime: dayjs().add(3, "day").add(30, "minutes").toDate(),
            status: BookingStatus.PENDING,
          },
        ],
      },
      {
        title: "60min",
        slug: "60min",
        length: 60,
      },
      {
        title: "Multiple duration",
        slug: "multiple-duration",
        length: 75,
        metadata: {
          multipleDuration: [30, 75, 90],
        },
      },
      {
        title: "paid",
        slug: "paid",
        length: 60,
        price: 100,
      },
      {
        title: "In person meeting",
        slug: "in-person",
        length: 60,
        locations: [{ type: "inPerson", address: "London" }],
      },
      {
        title: "Zoom Event",
        slug: "zoom",
        length: 60,
        locations: [{ type: zoomMeta.appData?.location?.type }],
      },
      {
        title: "Daily Event",
        slug: "daily",
        length: 60,
        locations: [{ type: dailyMeta.appData?.location?.type }],
      },
      {
        title: "Google Meet",
        slug: "google-meet",
        length: 60,
        locations: [{ type: googleMeetMeta.appData?.location?.type }],
      },
      {
        title: "Yoga class",
        slug: "yoga-class",
        length: 30,
        recurringEvent: { freq: 2, count: 12, interval: 1 },
        _bookings: [
          {
            uid: uuid(),
            title: "Yoga class",
            recurringEventId: Buffer.from("yoga-class").toString("base64"),
            startTime: dayjs().add(1, "day").toDate(),
            endTime: dayjs().add(1, "day").add(30, "minutes").toDate(),
            status: BookingStatus.ACCEPTED,
          },
          {
            uid: uuid(),
            title: "Yoga class",
            recurringEventId: Buffer.from("yoga-class").toString("base64"),
            startTime: dayjs().add(1, "day").add(1, "week").toDate(),
            endTime: dayjs().add(1, "day").add(1, "week").add(30, "minutes").toDate(),
            status: BookingStatus.ACCEPTED,
          },
          {
            uid: uuid(),
            title: "Yoga class",
            recurringEventId: Buffer.from("yoga-class").toString("base64"),
            startTime: dayjs().add(1, "day").add(2, "week").toDate(),
            endTime: dayjs().add(1, "day").add(2, "week").add(30, "minutes").toDate(),
            status: BookingStatus.ACCEPTED,
          },
          {
            uid: uuid(),
            title: "Yoga class",
            recurringEventId: Buffer.from("yoga-class").toString("base64"),
            startTime: dayjs().add(1, "day").add(3, "week").toDate(),
            endTime: dayjs().add(1, "day").add(3, "week").add(30, "minutes").toDate(),
            status: BookingStatus.ACCEPTED,
          },
          {
            uid: uuid(),
            title: "Yoga class",
            recurringEventId: Buffer.from("yoga-class").toString("base64"),
            startTime: dayjs().add(1, "day").add(4, "week").toDate(),
            endTime: dayjs().add(1, "day").add(4, "week").add(30, "minutes").toDate(),
            status: BookingStatus.ACCEPTED,
          },
          {
            uid: uuid(),
            title: "Yoga class",
            recurringEventId: Buffer.from("yoga-class").toString("base64"),
            startTime: dayjs().add(1, "day").add(5, "week").toDate(),
            endTime: dayjs().add(1, "day").add(5, "week").add(30, "minutes").toDate(),
            status: BookingStatus.ACCEPTED,
          },
          {
            uid: uuid(),
            title: "Seeded Yoga class",
            description: "seeded",
            recurringEventId: Buffer.from("seeded-yoga-class").toString("base64"),
            startTime: dayjs().subtract(4, "day").toDate(),
            endTime: dayjs().subtract(4, "day").add(30, "minutes").toDate(),
            status: BookingStatus.ACCEPTED,
          },
          {
            uid: uuid(),
            title: "Seeded Yoga class",
            description: "seeded",
            recurringEventId: Buffer.from("seeded-yoga-class").toString("base64"),
            startTime: dayjs().subtract(4, "day").add(1, "week").toDate(),
            endTime: dayjs().subtract(4, "day").add(1, "week").add(30, "minutes").toDate(),
            status: BookingStatus.ACCEPTED,
          },
          {
            uid: uuid(),
            title: "Seeded Yoga class",
            description: "seeded",
            recurringEventId: Buffer.from("seeded-yoga-class").toString("base64"),
            startTime: dayjs().subtract(4, "day").add(2, "week").toDate(),
            endTime: dayjs().subtract(4, "day").add(2, "week").add(30, "minutes").toDate(),
            status: BookingStatus.ACCEPTED,
          },
          {
            uid: uuid(),
            title: "Seeded Yoga class",
            description: "seeded",
            recurringEventId: Buffer.from("seeded-yoga-class").toString("base64"),
            startTime: dayjs().subtract(4, "day").add(3, "week").toDate(),
            endTime: dayjs().subtract(4, "day").add(3, "week").add(30, "minutes").toDate(),
            status: BookingStatus.ACCEPTED,
          },
        ],
      },
      {
        title: "Tennis class",
        slug: "tennis-class",
        length: 60,
        recurringEvent: { freq: 2, count: 10, interval: 2 },
        requiresConfirmation: true,
        _bookings: [
          {
            uid: uuid(),
            title: "Tennis class",
            recurringEventId: Buffer.from("tennis-class").toString("base64"),
            startTime: dayjs().add(2, "day").toDate(),
            endTime: dayjs().add(2, "day").add(60, "minutes").toDate(),
            status: BookingStatus.PENDING,
          },
          {
            uid: uuid(),
            title: "Tennis class",
            recurringEventId: Buffer.from("tennis-class").toString("base64"),
            startTime: dayjs().add(2, "day").add(2, "week").toDate(),
            endTime: dayjs().add(2, "day").add(2, "week").add(60, "minutes").toDate(),
            status: BookingStatus.PENDING,
          },
          {
            uid: uuid(),
            title: "Tennis class",
            recurringEventId: Buffer.from("tennis-class").toString("base64"),
            startTime: dayjs().add(2, "day").add(4, "week").toDate(),
            endTime: dayjs().add(2, "day").add(4, "week").add(60, "minutes").toDate(),
            status: BookingStatus.PENDING,
          },
          {
            uid: uuid(),
            title: "Tennis class",
            recurringEventId: Buffer.from("tennis-class").toString("base64"),
            startTime: dayjs().add(2, "day").add(8, "week").toDate(),
            endTime: dayjs().add(2, "day").add(8, "week").add(60, "minutes").toDate(),
            status: BookingStatus.PENDING,
          },
          {
            uid: uuid(),
            title: "Tennis class",
            recurringEventId: Buffer.from("tennis-class").toString("base64"),
            startTime: dayjs().add(2, "day").add(10, "week").toDate(),
            endTime: dayjs().add(2, "day").add(10, "week").add(60, "minutes").toDate(),
            status: BookingStatus.PENDING,
          },
        ],
      },
    ],
  });

  await createUserAndEventType({
    user: {
      email: "trial@example.com",
      password: "trial",
      username: "trial",
      name: "Trial Example",
    },
    eventTypes: [
      {
        title: "30min",
        slug: "30min",
        length: 30,
      },
      {
        title: "60min",
        slug: "60min",
        length: 60,
      },
    ],
  });

  await createUserAndEventType({
    user: {
      email: "free@example.com",
      password: "free",
      username: "free",
      name: "Free Example",
    },
    eventTypes: [
      {
        title: "30min",
        slug: "30min",
        length: 30,
      },
      {
        title: "60min",
        slug: "60min",
        length: 30,
      },
    ],
  });

  await createUserAndEventType({
    user: {
      email: "usa@example.com",
      password: "usa",
      username: "usa",
      name: "USA Timezone Example",
      timeZone: "America/Phoenix",
    },
    eventTypes: [
      {
        title: "30min",
        slug: "30min",
        length: 30,
      },
    ],
  });

  const freeUserTeam = await createUserAndEventType({
    user: {
      email: "teamfree@example.com",
      password: "teamfree",
      username: "teamfree",
      name: "Team Free Example",
    },
  });

  const proUserTeam = await createUserAndEventType({
    user: {
      email: "teampro@example.com",
      password: "teampro",
      username: "teampro",
      name: "Team Pro Example",
    },
  });

  await createUserAndEventType({
    user: {
      email: "admin@example.com",
      /** To comply with admin password requirements  */
      password: "ADMINadmin2022!",
      username: "admin",
      name: "Admin Example",
      role: "ADMIN",
    },
  });

  await createPlatformAndSetupUser({
    teamInput: {
      name: "Platform Team",
      slug: "platform-admin-team",
      isPlatform: true,
      isOrganization: true,
      eventTypes: {
        createMany: {
          data: [
            {
              title: "Collective Seeded Team Event",
              slug: "collective-seeded-team-event",
              length: 15,
              schedulingType: "COLLECTIVE",
            },
            {
              title: "Round Robin Seeded Team Event",
              slug: "round-robin-seeded-team-event",
              length: 15,
              schedulingType: "ROUND_ROBIN",
            },
          ],
        },
      },
      createdAt: new Date(),
    },
    user: {
      email: "platform@example.com",
      /** To comply with admin password requirements  */
      password: "PLATFORMadmin2024!",
      username: "platform",
      name: "Platform Admin",
      role: "USER",
    },
  });

  const pro2UserTeam = await createUserAndEventType({
    user: {
      email: "teampro2@example.com",
      password: "teampro2",
      username: "teampro2",
      name: "Team Pro Example 2",
    },
  });

  const pro3UserTeam = await createUserAndEventType({
    user: {
      email: "teampro3@example.com",
      password: "teampro3",
      username: "teampro3",
      name: "Team Pro Example 3",
    },
  });

  const pro4UserTeam = await createUserAndEventType({
    user: {
      email: "teampro4@example.com",
      password: "teampro4",
      username: "teampro4",
      name: "Team Pro Example 4",
    },
  });

  if (!!(process.env.E2E_TEST_CALCOM_QA_EMAIL && process.env.E2E_TEST_CALCOM_QA_PASSWORD)) {
    await createUserAndEventType({
      user: {
        email: process.env.E2E_TEST_CALCOM_QA_EMAIL || "qa@example.com",
        password: process.env.E2E_TEST_CALCOM_QA_PASSWORD || "qa",
        username: "qa",
        name: "QA Example",
      },
      eventTypes: [
        {
          title: "15min",
          slug: "15min",
          length: 15,
        },
      ],
      credentials: [
        !!process.env.E2E_TEST_CALCOM_QA_GCAL_CREDENTIALS
          ? {
              type: "google_calendar",
              key: JSON.parse(process.env.E2E_TEST_CALCOM_QA_GCAL_CREDENTIALS) as Prisma.JsonObject,
              appId: "google-calendar",
            }
          : null,
      ],
    });
  }

  await createTeamAndAddUsers(
    {
      name: "Seeded Team",
      slug: "seeded-team",
      eventTypes: {
        createMany: {
          data: [
            {
              title: "Collective Seeded Team Event",
              slug: "collective-seeded-team-event",
              length: 15,
              schedulingType: "COLLECTIVE",
            },
            {
              title: "Round Robin Seeded Team Event",
              slug: "round-robin-seeded-team-event",
              length: 15,
              schedulingType: "ROUND_ROBIN",
            },
          ],
        },
      },
      createdAt: new Date(),
    },
    [
      {
        id: proUserTeam.id,
        username: proUserTeam.name || "Unknown",
      },
      {
        id: freeUserTeam.id,
        username: freeUserTeam.name || "Unknown",
      },
      {
        id: pro2UserTeam.id,
        username: pro2UserTeam.name || "Unknown",
        role: "MEMBER",
      },
      {
        id: pro3UserTeam.id,
        username: pro3UserTeam.name || "Unknown",
      },
      {
        id: pro4UserTeam.id,
        username: pro4UserTeam.name || "Unknown",
      },
    ]
  );

  await createTeamAndAddUsers(
    {
      name: "Seeded Team (Marketing)",
      slug: "seeded-team-marketing",
      eventTypes: {
        createMany: {
          data: [
            {
              title: "Collective Seeded Team Event",
              slug: "collective-seeded-team-event",
              length: 15,
              schedulingType: "COLLECTIVE",
            },
            {
              title: "Round Robin Seeded Team Event",
              slug: "round-robin-seeded-team-event",
              length: 15,
              schedulingType: "ROUND_ROBIN",
            },
          ],
        },
      },
      createdAt: new Date(),
    },
    [
      {
        id: proUserTeam.id,
        username: proUserTeam.name || "Unknown",
      },
      {
        id: freeUserTeam.id,
        username: freeUserTeam.name || "Unknown",
      },
      {
        id: pro2UserTeam.id,
        username: pro2UserTeam.name || "Unknown",
        role: "MEMBER",
      },
      {
        id: pro3UserTeam.id,
        username: pro3UserTeam.name || "Unknown",
      },
      {
        id: pro4UserTeam.id,
        username: pro4UserTeam.name || "Unknown",
      },
    ]
  );

  await createTeamAndAddUsers(
    {
      name: "Seeded Team (Design)",
      slug: "seeded-team-design",
      eventTypes: {
        createMany: {
          data: [
            {
              title: "Collective Seeded Team Event",
              slug: "collective-seeded-team-event",
              length: 15,
              schedulingType: "COLLECTIVE",
            },
            {
              title: "Round Robin Seeded Team Event",
              slug: "round-robin-seeded-team-event",
              length: 15,
              schedulingType: "ROUND_ROBIN",
            },
          ],
        },
      },
      createdAt: new Date(),
    },
    [
      {
        id: proUserTeam.id,
        username: proUserTeam.name || "Unknown",
      },
      {
        id: freeUserTeam.id,
        username: freeUserTeam.name || "Unknown",
      },
      {
        id: pro2UserTeam.id,
        username: pro2UserTeam.name || "Unknown",
        role: "MEMBER",
      },
      {
        id: pro3UserTeam.id,
        username: pro3UserTeam.name || "Unknown",
      },
      {
        id: pro4UserTeam.id,
        username: pro4UserTeam.name || "Unknown",
      },
    ]
  );

  await createOrganizationAndAddMembersAndTeams({
    org: {
      orgData: {
        name: "Acme Inc",
        slug: "acme",
        isOrganization: true,
        organizationSettings: {
          isOrganizationVerified: true,
          orgAutoAcceptEmail: "acme.com",
          isAdminAPIEnabled: true,
          isAdminReviewed: true,
        },
      },
      members: [
        {
          memberData: {
            email: "owner1-acme@example.com",
            password: {
              create: {
                hash: "owner1-acme",
              },
            },
            username: "owner1-acme",
            name: "Owner 1",
          },
          orgMembership: {
            role: "OWNER",
            accepted: true,
          },
          orgProfile: {
            username: "owner1",
          },
          inTeams: [
            {
              slug: "team1",
              role: "ADMIN",
            },
          ],
        },
        ...Array.from({ length: 10 }, (_, i) => ({
          memberData: {
            email: `member${i}-acme@example.com`,
            password: {
              create: {
                hash: `member${i}-acme`,
              },
            },
            username: `member${i}-acme`,
            name: `Member ${i}`,
          },
          orgMembership: {
            role: MembershipRole.MEMBER,
            accepted: true,
          },
          orgProfile: {
            username: `member${i}`,
          },
          inTeams:
            i % 2 === 0
              ? [
                  {
                    slug: "team1",
                    role: MembershipRole.MEMBER,
                  },
                ]
              : [],
        })),
      ],
    },
    teams: [
      {
        teamData: {
          name: "Team 1",
          slug: "team1",
        },
        nonOrgMembers: [
          {
            email: "non-acme-member-1@example.com",
            password: {
              create: {
                hash: "non-acme-member-1",
              },
            },
            username: "non-acme-member-1",
            name: "NonAcme Member1",
          },
        ],
      },
    ],
    usersOutsideOrg: [
      {
        name: "Jane Doe",
        email: "jane@acme.com",
        username: "jane-outside-org",
      },
    ],
  });

  await createOrganizationAndAddMembersAndTeams({
    org: {
      orgData: {
        name: "Dunder Mifflin",
        slug: "dunder-mifflin",
        isOrganization: true,
        organizationSettings: {
          isOrganizationVerified: true,
          orgAutoAcceptEmail: "dunder-mifflin.com",
          isAdminReviewed: true,
        },
      },
      members: [
        {
          memberData: {
            email: "owner1-dunder@example.com",
            password: {
              create: {
                hash: "owner1-dunder",
              },
            },
            username: "owner1-dunder",
            name: "Owner 1",
          },
          orgMembership: {
            role: "OWNER",
            accepted: true,
          },
          orgProfile: {
            username: "owner1",
          },
          inTeams: [
            {
              slug: "team1",
              role: "ADMIN",
            },
          ],
        },
      ],
    },
    teams: [
      {
        teamData: {
          name: "Team 1",
          slug: "team1",
        },
        nonOrgMembers: [
          {
            email: "non-dunder-member-1@example.com",
            password: {
              create: {
                hash: "non-dunder-member-1",
              },
            },
            username: "non-dunder-member-1",
            name: "NonDunder Member1",
          },
        ],
      },
    ],
    usersOutsideOrg: [
      {
        name: "John Doe",
        email: "john@dunder-mifflin.com",
        username: "john-outside-org",
      },
    ],
  });

  const seededForm = {
    id: "948ae412-d995-4865-875a-48302588de03",
    name: "Seeded Form - Pro",
  };

  const form = await prisma.app_RoutingForms_Form.findUnique({
    where: {
      id: seededForm.id,
    },
  });
  if (form) {
    console.log(`Skipping Routing Form - Form Seed, "Seeded Form - Pro" already exists`);
  } else {
    const proUser = await prisma.user.findFirst({
      where: {
        username: "pro",
      },
    });

    if (!proUser) {
      console.log(`Skipping Routing Form - Seeding - Pro User not found`);
    } else {
      const multiSelectLegacyFieldId = "d2292635-9f12-17b1-9153-c3a854649182";
      await prisma.app_RoutingForms_Form.create({
        data: {
          id: seededForm.id,
          routes: [
            {
              id: "8a898988-89ab-4cde-b012-31823f708642",
              action: { type: "eventTypeRedirectUrl", value: "pro/30min" },
              queryValue: {
                id: "8a898988-89ab-4cde-b012-31823f708642",
                type: "group",
                children1: {
                  "8988bbb8-0123-4456-b89a-b1823f70c5ff": {
                    type: "rule",
                    properties: {
                      field: "c1296635-9f12-47b1-8153-c3a854649182",
                      value: ["event-routing"],
                      operator: "equal",
                      valueSrc: ["value"],
                      valueType: ["text"],
                    },
                  },
                },
              },
            },
            {
              id: "aa8aaba9-cdef-4012-b456-71823f70f7ef",
              action: { type: "customPageMessage", value: "Custom Page Result" },
              queryValue: {
                id: "aa8aaba9-cdef-4012-b456-71823f70f7ef",
                type: "group",
                children1: {
                  "b99b8a89-89ab-4cde-b012-31823f718ff5": {
                    type: "rule",
                    properties: {
                      field: "c1296635-9f12-47b1-8153-c3a854649182",
                      value: ["custom-page"],
                      operator: "equal",
                      valueSrc: ["value"],
                      valueType: ["text"],
                    },
                  },
                },
              },
            },
            {
              id: "a8ba9aab-4567-489a-bcde-f1823f71b4ad",
              action: { type: "externalRedirectUrl", value: "https://cal.com" },
              queryValue: {
                id: "a8ba9aab-4567-489a-bcde-f1823f71b4ad",
                type: "group",
                children1: {
                  "998b9b9a-0123-4456-b89a-b1823f7232b9": {
                    type: "rule",
                    properties: {
                      field: "c1296635-9f12-47b1-8153-c3a854649182",
                      value: ["external-redirect"],
                      operator: "equal",
                      valueSrc: ["value"],
                      valueType: ["text"],
                    },
                  },
                },
              },
            },
            {
              id: "aa8ba8b9-0123-4456-b89a-b182623406d8",
              action: { type: "customPageMessage", value: "Multiselect chosen" },
              queryValue: {
                id: "aa8ba8b9-0123-4456-b89a-b182623406d8",
                type: "group",
                children1: {
                  "b98a8abb-cdef-4012-b456-718262343d27": {
                    type: "rule",
                    properties: {
                      field: multiSelectLegacyFieldId,
                      value: [["Option-2"]],
                      operator: "multiselect_equals",
                      valueSrc: ["value"],
                      valueType: ["multiselect"],
                    },
                  },
                },
              },
            },
            {
              id: "898899aa-4567-489a-bcde-f1823f708646",
              action: { type: "customPageMessage", value: "Fallback Message" },
              isFallback: true,
              queryValue: { id: "898899aa-4567-489a-bcde-f1823f708646", type: "group" },
            },
          ],
          fields: [
            {
              id: "c1296635-9f12-47b1-8153-c3a854649182",
              type: "text",
              label: "Test field",
              required: true,
            },
            {
              id: multiSelectLegacyFieldId,
              type: "multiselect",
              label: "Multi Select(with legacy `selectText`)",
              identifier: "multi",
              selectText: "Option-1\nOption-2",
              required: false,
            },
            {
              id: "d3292635-9f12-17b1-9153-c3a854649182",
              type: "multiselect",
              label: "Multi Select",
              identifier: "multi",
              options: [
                {
                  id: "d1234635-9f12-17b1-9153-c3a854649182",
                  label: "Option-1",
                },
                {
                  id: "d1235635-9f12-17b1-9153-c3a854649182",
                  label: "Option-2",
                },
              ],
              required: false,
            },
          ],
          user: {
            connect: {
              email_username: {
                username: "pro",
                email: "pro@example.com",
              },
            },
          },
          name: seededForm.name,
        },
      });
    }
  }
}

async function runSeed() {
  await prisma.$connect();

  await mainAppStore();
  await main();
  await mainHugeEventTypesSeed();
}

runSeed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
