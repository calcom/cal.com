import { faker } from "@faker-js/faker";

import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { createUserAndEventType, createTeamAndAddUsers, seedAttributes } from "@calcom/prisma/seed-utils";

export async function seedLargeOrganization(
  options = {
    userCount: 200,
    teamsCount: 5,
    eventTypesPerUser: 3,
    bookingsPerEventType: 15,
  }
) {
  console.log("🏢 Seeding large organization (Deel-sized)...");
  const organizationName = "Deel-sized Test Organization";
  const orgAdminEmail = "org-admin@example.com";

  const adminUser = await createUserAndEventType({
    user: {
      email: orgAdminEmail,
      name: "Org Admin",
      password: "org-admin-password",
      username: "org-admin",
      theme: "light",
      role: "ADMIN",
    },
    eventTypes: [],
  });

  console.log(`👤 Created organization admin: ${adminUser.email}`);

  let organization = await prisma.team.findFirst({
    where: {
      name: organizationName,
    },
  });

  if (!organization) {
    try {
      organization = await prisma.team.create({
        data: {
          name: organizationName,
          slug: "deel-test-org",
          parentId: null,
          members: {
            create: {
              userId: adminUser.id,
              role: MembershipRole.OWNER,
              accepted: true,
            },
          },
        },
      });
      console.log(`🏢 Created organization: ${organization.name} (ID: ${organization.id})`);
    } catch (error) {
      console.log(`Organization creation failed, trying to find existing organization`);
      organization = await prisma.team.findFirst({
        where: {
          OR: [{ name: organizationName }, { slug: "deel-test-org" }],
        },
      });

      if (!organization) {
        throw new Error("Failed to create or find organization");
      }

      console.log(`🏢 Found existing organization: ${organization.name} (ID: ${organization.id})`);
    }
  } else {
    console.log(`🏢 Using existing organization: ${organization.name} (ID: ${organization.id})`);

    const membership = await prisma.membership.findFirst({
      where: {
        teamId: organization.id,
        userId: adminUser.id,
      },
    });

    if (!membership) {
      await prisma.membership.create({
        data: {
          teamId: organization.id,
          userId: adminUser.id,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      });
      console.log(`👤 Added admin user to existing organization`);
    }
  }

  const teams = [];
  for (let i = 0; i < options.teamsCount; i++) {
    const teamName = `Team ${i + 1}`;
    const team = await createTeamAndAddUsers(
      {
        name: teamName,
        slug: `team-${i + 1}`,
        parentId: organization.id,
      },
      [
        {
          id: adminUser.id,
          username: adminUser.username as string,
          role: MembershipRole.OWNER,
        },
      ]
    );

    if (team) {
      teams.push(team);
      console.log(`👥 Created team: ${team.name} (ID: ${team.id})`);
    }
  }

  const users = [];
  for (let i = 0; i < options.userCount; i++) {
    const userName = `${faker.name.firstName()} ${faker.name.lastName()}`;
    const userEmail = `test-user-${i}@example.com`;
    const username = `test-user-${i}`;

    const user = await createUserAndEventType({
      user: {
        email: userEmail,
        name: userName,
        password: "password",
        username,
        theme: "light",
      },
      eventTypes: [],
    });

    users.push(user);

    const existingMembership = await prisma.membership.findFirst({
      where: {
        teamId: organization.id,
        userId: user.id,
      },
    });

    if (!existingMembership) {
      await prisma.membership.create({
        data: {
          teamId: organization.id,
          userId: user.id,
          role: Math.random() > 0.9 ? MembershipRole.ADMIN : MembershipRole.MEMBER,
          accepted: true,
        },
      });
    }

    const randomTeam = teams[Math.floor(Math.random() * teams.length)];
    if (randomTeam) {
      const existingTeamMembership = await prisma.membership.findFirst({
        where: {
          teamId: randomTeam.id,
          userId: user.id,
        },
      });

      if (!existingTeamMembership) {
        await prisma.membership.create({
          data: {
            teamId: randomTeam.id,
            userId: user.id,
            role: Math.random() > 0.8 ? MembershipRole.ADMIN : MembershipRole.MEMBER,
            accepted: true,
          },
        });
      }
    }
  }

  console.log(`👥 Created ${users.length} users and added them to the organization`);

  await seedAttributes(organization.id);

  return {
    organization,
    adminUser,
    teams,
    users,
  };
}
