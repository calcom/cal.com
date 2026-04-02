import process from "node:process";
import type { FeatureId } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { hashPassword } from "@calcom/lib/auth/hashPassword";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import prisma from "@calcom/prisma";
import { MembershipRole, RoleType } from "@calcom/prisma/enums";
import { uuid } from "short-uuid";

/**
 * Creates an organization with custom roles and PBAC (Permission-Based Access Control) enabled
 * This demonstrates how to set up fine-grained permissions for team members
 */
export async function createPBACOrganization() {
  console.log("🏢 Creating PBAC-enabled organization with custom roles...");

  // Check if organization already exists
  const existingOrg = await prisma.team.findFirst({
    where: {
      slug: "pbac-demo-org",
      isOrganization: true,
    },
  });

  if (existingOrg) {
    console.log("⚠️  PBAC Demo Organization already exists, skipping creation");
    return {
      organization: existingOrg,
      customRoles: {},
      users: [],
      team: null,
    };
  }

  // First, create the organization
  const organization = await prisma.team.create({
    data: {
      name: "PBAC Demo Organization",
      slug: "pbac-demo-org",
      isOrganization: true,
      metadata: {
        isOrganization: true,
      },
      organizationSettings: {
        create: {
          isOrganizationVerified: true,
          orgAutoAcceptEmail: "pbac-demo.com",
          isAdminAPIEnabled: true,
          isAdminReviewed: true,
        },
      },
    },
  });

  // Add the feature flag
  const featuresRepository = new FeaturesRepository(prisma);
  await featuresRepository.setTeamFeatureState({
    teamId: organization.id,
    featureId: "pbac" as FeatureId,
    state: "enabled",
    assignedBy: "system (Seed script)",
  });

  console.log(`✅ Created organization: ${organization.name} (ID: ${organization.id})`);

  // Create custom roles with specific permissions
  const customRoles = await createCustomRoles(organization.id);

  // Create users with different roles
  const users = await createUsersWithRoles(organization.id, customRoles);

  // Create a team within the organization
  const team = await createTeamWithCustomRoles(organization.id, users, customRoles);

  console.log("🎉 PBAC organization setup complete!");
  console.log(`Organization URL: ${process.env.NEXT_PUBLIC_WEBAPP_URL}/org/${organization.slug}`);

  // Display created users with their credentials and permissions
  console.log("\n📋 Created Users - Login Credentials & Permissions:");
  console.log("=".repeat(80));
  users.forEach(({ user, role, customRole }) => {
    const password = getPasswordForUser(user.email);
    const permissions = getPermissionsForRole(user.email, customRoles);

    console.log(`👤 ${user.name}`);
    console.log(`   📧 Email: ${user.email}`);
    console.log(`   🔑 Password: ${password}`);
    console.log(`   👔 Role: ${role}${customRole ? ` (${customRole})` : ""}`);

    if (permissions.length > 0) {
      console.log(`   🔐 Permissions:`);
      permissions.forEach((permission) => {
        console.log(`      • ${permission.resource}:${permission.action}`);
      });
    } else {
      console.log(`   🔐 Permissions: Full access (Owner role)`);
    }
    console.log("");
  });
  console.log("=".repeat(80));

  return {
    organization,
    customRoles,
    users,
    team,
  };
}

/**
 * Creates custom roles with specific permissions for the organization
 */
async function createCustomRoles(organizationId: number) {
  console.log("🔐 Creating custom roles with PBAC permissions...");

  // Check if roles already exist
  const existingRoles = await prisma.role.findMany({
    where: { teamId: organizationId },
  });

  if (existingRoles.length > 0) {
    console.log("⚠️  Custom roles already exist for this organization, skipping creation");
    return {
      eventManager: existingRoles.find((r) => r.name === "Event Manager"),
      analytics: existingRoles.find((r) => r.name === "Analytics Specialist"),
      teamCoordinator: existingRoles.find((r) => r.name === "Team Coordinator"),
      supportAgent: existingRoles.find((r) => r.name === "Support Agent"),
    };
  }

  // Event Manager Role - Can manage event types and bookings
  const eventManagerRole = await prisma.role.create({
    data: {
      id: `event_manager_${organizationId}`,
      name: "Event Manager",
      description: "Can create and manage event types, view bookings and recordings",
      color: "#3B82F6", // Blue
      teamId: organizationId,
      type: RoleType.CUSTOM,
      permissions: {
        create: [
          // Event Type permissions
          { resource: "eventType", action: "create" },
          { resource: "eventType", action: "read" },
          { resource: "eventType", action: "update" },
          { resource: "eventType", action: "delete" },

          // Booking permissions
          { resource: "booking", action: "read" },
          { resource: "booking", action: "update" },
          { resource: "booking", action: "readRecordings" },

          // Team read access
          { resource: "team", action: "read" },

          // Availability override
          { resource: "availability", action: "override" },
        ],
      },
    },
    include: {
      permissions: true,
    },
  });
  // Analytics Specialist Role - Can view insights and reports
  const analyticsRole = await prisma.role.create({
    data: {
      id: `analytics_specialist_${organizationId}`,
      name: "Analytics Specialist",
      description: "Can view insights, reports, and booking analytics",
      color: "#10B981", // Green
      teamId: organizationId,
      type: RoleType.CUSTOM,
      permissions: {
        create: [
          // Insights permissions
          { resource: "insights", action: "read" },

          // Booking read access
          { resource: "booking", action: "read" },
          { resource: "booking", action: "readTeamBookings" },
          { resource: "booking", action: "readOrgBookings" },

          // Event Type read access
          { resource: "eventType", action: "read" },

          // Team and organization read access
          { resource: "team", action: "read" },
          { resource: "organization", action: "read" },
          { resource: "organization", action: "listMembers" },

          // Routing forms for conversion tracking
          { resource: "routingForm", action: "read" },
        ],
      },
    },
    include: {
      permissions: true,
    },
  });
  // Team Coordinator Role - Can manage team members and workflows
  const teamCoordinatorRole = await prisma.role.create({
    data: {
      id: `team_coordinator_${organizationId}`,
      name: "Team Coordinator",
      description: "Can invite/remove team members, manage workflows and routing forms",
      color: "#8B5CF6", // Purple
      teamId: organizationId,
      type: RoleType.CUSTOM,
      permissions: {
        create: [
          // Team management
          { resource: "team", action: "read" },
          { resource: "team", action: "update" },
          { resource: "team", action: "invite" },
          { resource: "team", action: "remove" },
          { resource: "team", action: "changeMemberRole" },

          // Organization member management
          { resource: "organization", action: "read" },
          { resource: "organization", action: "listMembers" },

          // Workflow management
          { resource: "workflow", action: "create" },
          { resource: "workflow", action: "read" },
          { resource: "workflow", action: "update" },
          { resource: "workflow", action: "delete" },

          // Routing form management
          { resource: "routingForm", action: "create" },
          { resource: "routingForm", action: "read" },
          { resource: "routingForm", action: "update" },
          { resource: "routingForm", action: "delete" },

          // Basic booking access
          { resource: "booking", action: "read" },
          { resource: "eventType", action: "read" },
        ],
      },
    },
    include: {
      permissions: true,
    },
  });
  // Support Agent Role - Limited access for customer support
  const supportAgentRole = await prisma.role.create({
    data: {
      id: `support_agent_${organizationId}`,
      name: "Support Agent",
      description: "Can view bookings and basic event information for customer support",
      color: "#F59E0B", // Amber
      teamId: organizationId,
      type: RoleType.CUSTOM,
      permissions: {
        create: [
          // Limited booking access
          { resource: "booking", action: "read" },
          { resource: "booking", action: "update" }, // For rescheduling/canceling

          // Event Type read access
          { resource: "eventType", action: "read" },

          // Team read access
          { resource: "team", action: "read" },

          // Organization read access
          { resource: "organization", action: "read" },
        ],
      },
    },
    include: {
      permissions: true,
    },
  });
  console.log("✅ Created custom roles:");
  console.log(`  - Event Manager (${eventManagerRole.permissions.length} permissions)`);
  console.log(`  - Analytics Specialist (${analyticsRole.permissions.length} permissions)`);
  console.log(`  - Team Coordinator (${teamCoordinatorRole.permissions.length} permissions)`);
  console.log(`  - Support Agent (${supportAgentRole.permissions.length} permissions)`);

  return {
    eventManager: eventManagerRole,
    analytics: analyticsRole,
    teamCoordinator: teamCoordinatorRole,
    supportAgent: supportAgentRole,
  };
}

/**
 * Creates users with different roles in the organization
 */
async function createUsersWithRoles(organizationId: number, customRoles: any) {
  console.log("👥 Creating users with custom roles...");

  const users: Array<{
    user: any;
    role: MembershipRole;
    customRole: string | null;
  }> = [];

  // Check if users already exist
  const existingUsers = await prisma.user.findMany({
    where: {
      email: {
        in: [
          "owner@pbac-demo.com",
          "events@pbac-demo.com",
          "analytics@pbac-demo.com",
          "coordinator@pbac-demo.com",
          "support@pbac-demo.com",
        ],
      },
    },
  });

  if (existingUsers.length > 0) {
    console.log("⚠️  Some PBAC users already exist, skipping user creation");
    return existingUsers.map((user) => ({
      user,
      role: MembershipRole.MEMBER,
      customRole: null,
    }));
  }

  // Organization Owner
  const owner = await createUser({
    email: "owner@pbac-demo.com",
    username: "pbac-owner",
    name: "Organization Owner",
    password: "pbac-owner-2024!",
  });

  await createMembership({
    userId: owner.id,
    teamId: organizationId,
    role: MembershipRole.OWNER,
    customRoleId: null, // Uses default owner role
  });

  await createProfile({
    userId: owner.id,
    organizationId,
    username: "owner",
  });

  users.push({ user: owner, role: MembershipRole.OWNER, customRole: null });

  // Event Manager
  const eventManager = await createUser({
    email: "events@pbac-demo.com",
    username: "pbac-events",
    name: "Event Manager",
    password: "events-2024!",
  });

  await createMembership({
    userId: eventManager.id,
    teamId: organizationId,
    role: MembershipRole.MEMBER,
    customRoleId: customRoles.eventManager.id,
  });

  await createProfile({
    userId: eventManager.id,
    organizationId,
    username: "events",
  });

  users.push({ user: eventManager, role: MembershipRole.MEMBER, customRole: "Event Manager" });

  // Analytics Specialist
  const analytics = await createUser({
    email: "analytics@pbac-demo.com",
    username: "pbac-analytics",
    name: "Analytics Specialist",
    password: "analytics-2024!",
  });

  await createMembership({
    userId: analytics.id,
    teamId: organizationId,
    role: MembershipRole.MEMBER,
    customRoleId: customRoles.analytics.id,
  });

  await createProfile({
    userId: analytics.id,
    organizationId,
    username: "analytics",
  });

  users.push({ user: analytics, role: MembershipRole.MEMBER, customRole: "Analytics Specialist" });

  // Team Coordinator
  const coordinator = await createUser({
    email: "coordinator@pbac-demo.com",
    username: "pbac-coordinator",
    name: "Team Coordinator",
    password: "coordinator-2024!",
  });

  await createMembership({
    userId: coordinator.id,
    teamId: organizationId,
    role: MembershipRole.ADMIN,
    customRoleId: customRoles.teamCoordinator.id,
  });

  await createProfile({
    userId: coordinator.id,
    organizationId,
    username: "coordinator",
  });

  users.push({ user: coordinator, role: MembershipRole.ADMIN, customRole: "Team Coordinator" });

  // Support Agent
  const support = await createUser({
    email: "support@pbac-demo.com",
    username: "pbac-support",
    name: "Support Agent",
    password: "support-2024!",
  });

  await createMembership({
    userId: support.id,
    teamId: organizationId,
    role: MembershipRole.MEMBER,
    customRoleId: customRoles.supportAgent.id,
  });

  await createProfile({
    userId: support.id,
    organizationId,
    username: "support",
  });

  users.push({ user: support, role: MembershipRole.MEMBER, customRole: "Support Agent" });

  console.log("✅ Created users with roles:");
  users.forEach(({ user, role, customRole }) => {
    console.log(`  - ${user.name} (${user.email}) - ${role}${customRole ? ` + ${customRole}` : ""}`);
  });

  return users;
}

/**
 * Creates a team within the organization with custom role assignments
 */
async function createTeamWithCustomRoles(organizationId: number, users: any[], customRoles: any) {
  console.log("🏢 Creating team with custom role assignments...");

  const team = await prisma.team.create({
    data: {
      name: "Sales Team",
      slug: "sales-team",
      parentId: organizationId,
      metadata: {},
    },
  });

  // Add team members with their custom roles
  for (const { user } of users) {
    let customRoleId: string | null = null;

    // Assign appropriate roles for the team
    if (user.email === "owner@pbac-demo.com") {
      customRoleId = "owner_role";
    } else if (user.email === "coordinator@pbac-demo.com") {
      customRoleId = customRoles.teamCoordinator.id;
    } else if (user.email === "events@pbac-demo.com") {
      customRoleId = customRoles.eventManager.id;
    } else if (user.email === "analytics@pbac-demo.com") {
      customRoleId = customRoles.analytics.id;
    } else if (user.email === "support@pbac-demo.com") {
      customRoleId = customRoles.supportAgent.id;
    }

    await prisma.membership.create({
      data: {
        userId: user.id,
        teamId: team.id,
        role: MembershipRole.MEMBER,
        customRoleId,
        accepted: true,
      },
    });
  }

  // Create some event types for the team
  await prisma.eventType.create({
    data: {
      title: "Sales Consultation",
      slug: "sales-consultation",
      length: 30,
      teamId: team.id,
      userId: users[0].user.id, // Owner as the creator
      users: {
        connect: users.map(({ user }) => ({ id: user.id })),
      },
    },
  });

  await prisma.eventType.create({
    data: {
      title: "Product Demo",
      slug: "product-demo",
      length: 45,
      teamId: team.id,
      userId: users[0].user.id, // Owner as the creator
      users: {
        connect: users.slice(0, 3).map(({ user }) => ({ id: user.id })), // First 3 users
      },
    },
  });

  console.log(`✅ Created team: ${team.name} with ${users.length} members`);
  console.log(`Team URL: ${process.env.NEXT_PUBLIC_WEBAPP_URL}/team/${team.slug}`);

  return team;
}

/**
 * Helper function to create a user
 */
async function createUser(userData: { email: string; username: string; name: string; password: string }) {
  const user = await prisma.user.create({
    data: {
      email: userData.email,
      username: userData.username,
      name: userData.name,
      emailVerified: new Date(),
      completedOnboarding: true,
      locale: "en",
      schedules: {
        create: {
          name: "Working Hours",
          availability: {
            createMany: {
              data: getAvailabilityFromSchedule(DEFAULT_SCHEDULE),
            },
          },
        },
      },
    },
  });

  await prisma.userPassword.create({
    data: {
      userId: user.id,
      hash: await hashPassword(userData.password),
    },
  });

  return user;
}

/**
 * Helper function to create a membership
 */
async function createMembership({
  userId,
  teamId,
  role,
  customRoleId,
}: {
  userId: number;
  teamId: number;
  role: MembershipRole;
  customRoleId: string | null;
}) {
  return prisma.membership.create({
    data: {
      userId,
      teamId,
      role,
      customRoleId,
      accepted: true,
    },
  });
}

/**
 * Helper function to create a profile
 */
async function createProfile({
  userId,
  organizationId,
  username,
}: {
  userId: number;
  organizationId: number;
  username: string;
}) {
  const profile = await prisma.profile.create({
    data: {
      uid: uuid(),
      userId,
      organizationId,
      username,
    },
  });

  // Update user to point to this profile
  await prisma.user.update({
    where: { id: userId },
    data: { movedToProfileId: profile.id },
  });

  return profile;
}

/**
 * Helper function to get password for a user based on their email
 */
function getPasswordForUser(email: string): string {
  const passwordMap: Record<string, string> = {
    "owner@pbac-demo.com": "pbac-owner-2024!",
    "events@pbac-demo.com": "events-2024!",
    "analytics@pbac-demo.com": "analytics-2024!",
    "coordinator@pbac-demo.com": "coordinator-2024!",
    "support@pbac-demo.com": "support-2024!",
  };

  return passwordMap[email] || "unknown";
}

/**
 * Helper function to get permissions for a role based on user email
 */
function getPermissionsForRole(email: string, customRoles: any): Array<{ resource: string; action: string }> {
  // Owner has full access, no specific permissions to list
  if (email === "owner@pbac-demo.com") {
    return [];
  }

  // Map email to role and return permissions
  const rolePermissionMap: Record<string, Array<{ resource: string; action: string }>> = {
    "events@pbac-demo.com": [
      { resource: "eventType", action: "create" },
      { resource: "eventType", action: "read" },
      { resource: "eventType", action: "update" },
      { resource: "eventType", action: "delete" },
      { resource: "booking", action: "read" },
      { resource: "booking", action: "update" },
      { resource: "booking", action: "readRecordings" },
      { resource: "team", action: "read" },
      { resource: "availability", action: "override" },
    ],
    "analytics@pbac-demo.com": [
      { resource: "insights", action: "read" },
      { resource: "booking", action: "read" },
      { resource: "booking", action: "readTeamBookings" },
      { resource: "booking", action: "readOrgBookings" },
      { resource: "eventType", action: "read" },
      { resource: "team", action: "read" },
      { resource: "organization", action: "read" },
      { resource: "organization", action: "listMembers" },
      { resource: "routingForm", action: "read" },
    ],
    "coordinator@pbac-demo.com": [
      { resource: "team", action: "read" },
      { resource: "team", action: "update" },
      { resource: "team", action: "invite" },
      { resource: "team", action: "remove" },
      { resource: "team", action: "changeMemberRole" },
      { resource: "organization", action: "read" },
      { resource: "organization", action: "listMembers" },
      { resource: "workflow", action: "create" },
      { resource: "workflow", action: "read" },
      { resource: "workflow", action: "update" },
      { resource: "workflow", action: "delete" },
      { resource: "routingForm", action: "create" },
      { resource: "routingForm", action: "read" },
      { resource: "routingForm", action: "update" },
      { resource: "routingForm", action: "delete" },
      { resource: "booking", action: "read" },
      { resource: "eventType", action: "read" },
    ],
    "support@pbac-demo.com": [
      { resource: "booking", action: "read" },
      { resource: "booking", action: "update" },
      { resource: "eventType", action: "read" },
      { resource: "team", action: "read" },
      { resource: "organization", action: "read" },
    ],
  };

  return rolePermissionMap[email] || [];
}
// Run the function if this file is executed directly
if (require.main === module) {
  createPBACOrganization()
    .then(() => {
      console.log("✅ PBAC organization created successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error creating PBAC organization:", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
