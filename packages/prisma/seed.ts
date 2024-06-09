import type { Membership, Team, User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { uuid } from "short-uuid";
import type z from "zod";

import dailyMeta from "@calcom/app-store/dailyvideo/_metadata";
import googleMeetMeta from "@calcom/app-store/googlevideo/_metadata";
import zoomMeta from "@calcom/app-store/zoomvideo/_metadata";
import dayjs from "@calcom/dayjs";
import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { BookingStatus, MembershipRole, RedirectType, SchedulingType } from "@calcom/prisma/enums";
import type { Ensure } from "@calcom/types/utils";

import prisma from ".";
import mainAppStore from "./seed-app-store";
import mainHugeEventTypesSeed from "./seed-huge-event-types";
import { createUserAndEventType } from "./seed-utils";
import type { teamMetadataSchema } from "./zod-utils";

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
  const orgMembersInDb: (User & {
    inTeams: { slug: string; role: MembershipRole }[];
    orgMembership: Partial<Membership>;
    orgProfile: {
      username: string;
    };
  })[] = [];

  try {
    for (const member of orgMembers) {
      const newUser = await createUserAndEventType({
        user: {
          ...member.memberData,
          password: member.memberData.password.create?.hash,
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

      await prisma.tempOrgRedirect.create({
        data: {
          fromOrgId: 0,
          type: RedirectType.User,
          from: member.memberData.username,
          toUrl: `${getOrgFullOrigin(orgData.slug)}/${member.orgProfile.username}`,
        },
      });

      orgMembersInDb.push(orgMemberInDb);
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

  await createOrganizationAndAddMembersAndTeams({
    org: {
      orgData: {
        name: "Acme Inc",
        slug: "acme",
        isOrganization: true,
        organizationSettings: {
          isOrganizationVerified: true,
          orgAutoAcceptEmail: "acme.com",
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
        {
          memberData: {
            email: "member1-acme@example.com",
            password: {
              create: {
                hash: "member1-acme",
              },
            },
            username: "member1-acme",
            name: "Member 1",
          },
          orgMembership: {
            role: "MEMBER",
            accepted: true,
          },
          orgProfile: {
            username: "member1",
          },
          inTeams: [
            {
              slug: "team1",
              role: "ADMIN",
            },
          ],
        },
        {
          memberData: {
            email: "member2-acme@example.com",
            password: {
              create: {
                hash: "member2-acme",
              },
            },
            username: "member2-acme",
            name: "Member 2",
          },
          orgMembership: {
            role: "MEMBER",
            accepted: true,
          },
          orgProfile: {
            username: "member2",
          },
          inTeams: [],
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
}

main()
  .then(() => mainAppStore())
  .then(() => mainHugeEventTypesSeed())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
