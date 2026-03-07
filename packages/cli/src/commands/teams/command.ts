import type { Command } from "commander";
import {
  teamsInviteControllerCreateInvite as createInvite,
  teamsMembershipsControllerCreateTeamMembership as createMembership,
  teamsControllerCreateTeam as createTeam,
  teamsMembershipsControllerDeleteTeamMembership as deleteMembership,
  teamsControllerDeleteTeam as deleteTeam,
  organizationsTeamsBookingsControllerGetBookingReferences as getBookingReferences,
  meControllerGetMe as getMe,
  teamsMembershipsControllerGetTeamMembership as getMembership,
  teamsMembershipsControllerGetTeamMemberships as getMemberships,
  organizationsTeamsControllerGetMyTeams as getMyTeams,
  teamsControllerGetTeam as getTeam,
  teamsBookingsControllerGetAllTeamBookings as getTeamBookings,
  teamsControllerGetTeams as getTeams,
  organizationsEventTypesControllerGetTeamsEventTypes as getTeamsEventTypes,
  teamsMembershipsControllerUpdateTeamMembership as updateMembership,
  teamsControllerUpdateTeam as updateTeam,
} from "../../generated/sdk.gen";
import type {
  CreateTeamInput,
  CreateTeamMembershipInput,
  UpdateTeamMembershipInput,
} from "../../generated/types.gen";
import { initializeClient } from "../../shared/client";
import { ApiVersion } from "../../shared/constants";
import { withErrorHandling } from "../../shared/errors";
import { apiVersionHeader, authHeader } from "../../shared/headers";
import { renderBookingList } from "../bookings/output";
import {
  renderBookingReferencesList,
  renderInviteCreated,
  renderMembership,
  renderMembershipCreated,
  renderMembershipDeleted,
  renderMembershipList,
  renderMembershipUpdated,
  renderMyTeamsList,
  renderTeam,
  renderTeamCreated,
  renderTeamDeleted,
  renderTeamEventTypesList,
  renderTeamList,
  renderTeamUpdated,
} from "./output";
import type { BookingReferenceFilterType } from "./types";

async function getOrgId(): Promise<number> {
  const { data: response } = await getMe({ headers: authHeader() });
  const me = response?.data;

  if (!me) {
    throw new Error("Could not fetch your profile. Are you logged in?");
  }
  if (!me.organizationId) {
    throw new Error(
      "This command requires an organization. Your account does not belong to an organization."
    );
  }

  return me.organizationId;
}

function registerTeamQueryCommands(teamsCmd: Command): void {
  teamsCmd
    .command("list")
    .description("List all teams")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getTeams({
          headers: authHeader(),
        });

        renderTeamList(response?.data, options);
      });
    });

  teamsCmd
    .command("get <teamId>")
    .description("Get a team by ID")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getTeam({
          path: { teamId: Number(teamId) },
          headers: authHeader(),
        });

        renderTeam(response?.data, options);
      });
    });
}

function registerTeamMutationCommands(teamsCmd: Command): void {
  teamsCmd
    .command("create")
    .description("Create a team")
    .requiredOption("--name <name>", "Team name")
    .option("--slug <slug>", "Team slug (URL-friendly name)")
    .option("--bio <bio>", "Team bio/description")
    .option("--logo-url <url>", "Team logo URL")
    .option("--cal-video-logo <url>", "Cal Video logo URL")
    .option("--app-logo <url>", "App logo URL")
    .option("--app-icon-logo <url>", "App icon logo URL")
    .option("--banner-url <url>", "Banner URL")
    .option("--timezone <tz>", "Team timezone")
    .option("--week-start <day>", "Week start day")
    .option("--hide-branding", "Hide Cal.com branding")
    .option("--hide-book-team-member", "Hide book a team member option")
    .option("--is-private", "Make team private")
    .option("--brand-color <color>", "Primary brand color")
    .option("--dark-brand-color <color>", "Dark mode brand color")
    .option("--theme <theme>", "UI theme")
    .option("--time-format <format>", "Time format (12 or 24)")
    .option("--auto-accept-creator", "Auto-accept team creator membership (default: true)")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        name: string;
        slug?: string;
        bio?: string;
        logoUrl?: string;
        calVideoLogo?: string;
        appLogo?: string;
        appIconLogo?: string;
        bannerUrl?: string;
        timezone?: string;
        weekStart?: string;
        hideBranding?: boolean;
        hideBookATeamMember?: boolean;
        isPrivate?: boolean;
        brandColor?: string;
        darkBrandColor?: string;
        theme?: string;
        timeFormat?: string;
        autoAcceptCreator?: boolean;
        json?: boolean;
      }) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const body: CreateTeamInput = {
            name: options.name,
          };

          if (options.slug) body.slug = options.slug;
          if (options.bio) body.bio = options.bio;
          if (options.logoUrl) body.logoUrl = options.logoUrl;
          if (options.calVideoLogo) body.calVideoLogo = options.calVideoLogo;
          if (options.appLogo) body.appLogo = options.appLogo;
          if (options.appIconLogo) body.appIconLogo = options.appIconLogo;
          if (options.bannerUrl) body.bannerUrl = options.bannerUrl;
          if (options.timezone) body.timeZone = options.timezone;
          if (options.weekStart) body.weekStart = options.weekStart;
          if (options.hideBranding !== undefined) body.hideBranding = options.hideBranding;
          if (options.hideBookATeamMember !== undefined)
            body.hideBookATeamMember = options.hideBookATeamMember;
          if (options.isPrivate !== undefined) body.isPrivate = options.isPrivate;
          if (options.brandColor) body.brandColor = options.brandColor;
          if (options.darkBrandColor) body.darkBrandColor = options.darkBrandColor;
          if (options.theme) body.theme = options.theme;
          if (options.timeFormat) body.timeFormat = Number(options.timeFormat) as 12 | 24;
          if (options.autoAcceptCreator !== undefined) body.autoAcceptCreator = options.autoAcceptCreator;

          const { data: response } = await createTeam({
            body,
            headers: authHeader(),
          });

          renderTeamCreated(response?.data, options);
        });
      }
    );

  teamsCmd
    .command("update <teamId>")
    .description("Update a team")
    .option("--name <name>", "Team name")
    .option("--slug <slug>", "Team slug")
    .option("--bio <bio>", "Team bio/description")
    .option("--logo-url <url>", "Team logo URL")
    .option("--timezone <tz>", "Team timezone")
    .option("--week-start <day>", "Week start day")
    .option("--hide-branding <value>", "Hide Cal.com branding (true/false)")
    .option("--hide-bookings-from-banner <value>", "Hide bookings from banner (true/false)")
    .option("--brand-color <color>", "Primary brand color")
    .option("--dark-brand-color <color>", "Dark mode brand color")
    .option("--time-format <format>", "Time format (12 or 24)")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        options: {
          name?: string;
          slug?: string;
          bio?: string;
          logoUrl?: string;
          timezone?: string;
          weekStart?: string;
          hideBranding?: string;
          hideBookATeamMember?: string;
          brandColor?: string;
          darkBrandColor?: string;
          timeFormat?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const body: Record<string, unknown> = {};

          if (options.name) body.name = options.name;
          if (options.slug) body.slug = options.slug;
          if (options.bio) body.bio = options.bio;
          if (options.logoUrl) body.logoUrl = options.logoUrl;
          if (options.timezone) body.timeZone = options.timezone;
          if (options.weekStart) body.weekStart = options.weekStart;
          if (options.hideBranding !== undefined) body.hideBranding = options.hideBranding === "true";
          if (options.hideBookATeamMember !== undefined)
            body.hideBookATeamMember = options.hideBookATeamMember === "true";
          if (options.brandColor) body.brandColor = options.brandColor;
          if (options.darkBrandColor) body.darkBrandColor = options.darkBrandColor;
          if (options.timeFormat) body.timeFormat = Number(options.timeFormat);

          const { data: response } = await updateTeam({
            path: { teamId: Number(teamId) },
            body,
            headers: authHeader(),
          });

          renderTeamUpdated(response?.data, options);
        });
      }
    );

  teamsCmd
    .command("delete <teamId>")
    .description("Delete a team")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        await deleteTeam({
          path: { teamId: Number(teamId) },
          headers: authHeader(),
        });

        renderTeamDeleted(teamId, options);
      });
    });
}

function registerMembershipCommands(teamsCmd: Command): void {
  const membersCmd = teamsCmd.command("members").description("Manage team members");

  membersCmd
    .command("list <teamId>")
    .description("List team members")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getMemberships({
          path: { teamId: Number(teamId) },
          headers: authHeader(),
        });

        // API spec incorrectly shows single object, but endpoint returns array
        const memberships = Array.isArray(response?.data)
          ? response.data
          : response?.data
            ? [response.data]
            : [];
        renderMembershipList(memberships, options);
      });
    });

  membersCmd
    .command("get <teamId> <membershipId>")
    .description("Get a team membership")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, membershipId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getMembership({
          path: { teamId: Number(teamId), membershipId: Number(membershipId) },
          headers: authHeader(),
        });

        renderMembership(response?.data, options);
      });
    });

  membersCmd
    .command("add <teamId>")
    .description("Add a member to a team")
    .requiredOption("--user-id <id>", "User ID to add")
    .option("--role <role>", "Member role (MEMBER, ADMIN, OWNER)", "MEMBER")
    .option("--accepted", "Mark membership as accepted")
    .option("--disable-impersonation", "Disable impersonation for this member")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        options: {
          userId: string;
          role: string;
          accepted?: boolean;
          disableImpersonation?: boolean;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const body: CreateTeamMembershipInput = {
            userId: Number(options.userId),
            role: options.role as CreateTeamMembershipInput["role"],
            accepted: options.accepted ?? false,
            disableImpersonation: options.disableImpersonation ?? false,
          };

          const { data: response } = await createMembership({
            path: { teamId: Number(teamId) },
            body,
            headers: authHeader(),
          });

          renderMembershipCreated(response?.data, options);
        });
      }
    );

  membersCmd
    .command("update <teamId> <membershipId>")
    .description("Update a team membership")
    .option("--role <role>", "Member role (MEMBER, ADMIN, OWNER)")
    .option("--accepted <value>", "Membership accepted (true/false)")
    .option("--disable-impersonation <value>", "Disable impersonation (true/false)")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        membershipId: string,
        options: {
          role?: string;
          accepted?: string;
          disableImpersonation?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const body: UpdateTeamMembershipInput = {};

          if (options.role) body.role = options.role as UpdateTeamMembershipInput["role"];
          if (options.accepted !== undefined) body.accepted = options.accepted === "true";
          if (options.disableImpersonation !== undefined)
            body.disableImpersonation = options.disableImpersonation === "true";

          const { data: response } = await updateMembership({
            path: { teamId: Number(teamId), membershipId: Number(membershipId) },
            body,
            headers: authHeader(),
          });

          renderMembershipUpdated(response?.data, options);
        });
      }
    );

  membersCmd
    .command("remove <teamId> <membershipId>")
    .description("Remove a member from a team")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, membershipId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        await deleteMembership({
          path: { teamId: Number(teamId), membershipId: Number(membershipId) },
          headers: authHeader(),
        });

        renderMembershipDeleted(membershipId, options);
      });
    });
}

function registerTeamBookingsCommand(teamsCmd: Command): void {
  teamsCmd
    .command("bookings <teamId>")
    .description("List all bookings for a team")
    .option("--status <status>", "Filter by status (upcoming,past,cancelled,recurring,unconfirmed)")
    .option("--attendee-email <email>", "Filter by attendee email")
    .option("--attendee-name <name>", "Filter by attendee name")
    .option("--event-type-id <id>", "Filter by event type ID")
    .option("--after-start <date>", "Filter bookings starting after this date (ISO 8601)")
    .option("--before-end <date>", "Filter bookings ending before this date (ISO 8601)")
    .option("--sort-start <order>", "Sort by start time (asc or desc)")
    .option("--sort-end <order>", "Sort by end time (asc or desc)")
    .option("--sort-created <order>", "Sort by creation time (asc or desc)")
    .option("--take <n>", "Number of bookings to return")
    .option("--skip <n>", "Number of bookings to skip")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        options: {
          status?: string;
          attendeeEmail?: string;
          attendeeName?: string;
          eventTypeId?: string;
          afterStart?: string;
          beforeEnd?: string;
          sortStart?: string;
          sortEnd?: string;
          sortCreated?: string;
          take?: string;
          skip?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const { data: response } = await getTeamBookings({
            path: { teamId: Number(teamId) },
            query: {
              status: options.status ? [options.status as "upcoming"] : undefined,
              attendeeEmail: options.attendeeEmail,
              attendeeName: options.attendeeName,
              eventTypeId: options.eventTypeId,
              afterStart: options.afterStart,
              beforeEnd: options.beforeEnd,
              sortStart: options.sortStart as "asc" | "desc" | undefined,
              sortEnd: options.sortEnd as "asc" | "desc" | undefined,
              sortCreated: options.sortCreated as "asc" | "desc" | undefined,
              take: options.take ? Number(options.take) : undefined,
              skip: options.skip ? Number(options.skip) : undefined,
            },
            headers: {
              ...authHeader(),
              ...apiVersionHeader(ApiVersion.V2024_08_13),
            },
          });

          renderBookingList(response?.data, options);
        });
      }
    );
}

function registerTeamInviteCommand(teamsCmd: Command): void {
  teamsCmd
    .command("invite <teamId>")
    .description("Create an invite link for a team")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await createInvite({
          path: { teamId: Number(teamId) },
          headers: authHeader(),
        });

        renderInviteCreated(response?.data, options);
      });
    });
}

function registerOrgScopedTeamCommands(teamsCmd: Command): void {
  teamsCmd
    .command("me")
    .description("Get teams for current user (requires organization)")
    .option("--skip <n>", "Number of items to skip")
    .option("--take <n>", "Maximum number of items to return")
    .option("--json", "Output as JSON")
    .action(async (options: { skip?: string; take?: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await getMyTeams({
          path: { orgId },
          query: {
            skip: options.skip ? Number(options.skip) : undefined,
            take: options.take ? Number(options.take) : undefined,
          },
          headers: authHeader(),
        });

        renderMyTeamsList(response?.data, options);
      });
    });

  teamsCmd
    .command("all-event-types")
    .description("Get all team event types across organization (requires organization)")
    .option("--skip <n>", "Number of items to skip")
    .option("--take <n>", "Maximum number of items to return")
    .option("--sort-created <order>", "Sort by creation date (asc or desc)")
    .option("--json", "Output as JSON")
    .action(async (options: { skip?: string; take?: string; sortCreated?: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await getTeamsEventTypes({
          path: { orgId },
          query: {
            skip: options.skip ? Number(options.skip) : undefined,
            take: options.take ? Number(options.take) : undefined,
            sortCreatedAt: options.sortCreated as "asc" | "desc" | undefined,
          },
          headers: authHeader(),
        });

        renderTeamEventTypesList(response?.data, options);
      });
    });

  teamsCmd
    .command("booking-references <teamId> <bookingUid>")
    .description("Get booking references for a team booking (requires organization)")
    .option(
      "--type <type>",
      "Filter by reference type (google_calendar, office365_calendar, daily_video, google_video, office365_video, zoom_video)"
    )
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        bookingUid: string,
        options: {
          type?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

          const { data: response } = await getBookingReferences({
            path: {
              orgId,
              teamId: Number(teamId),
              bookingUid,
            },
            query: {
              type: options.type as BookingReferenceFilterType | undefined,
            },
            headers: authHeader(),
          });

          renderBookingReferencesList(response?.data, options);
        });
      }
    );
}

export function registerTeamsCommand(program: Command): void {
  const teamsCmd = program.command("teams").description("Manage teams and team members");
  registerTeamQueryCommands(teamsCmd);
  registerTeamMutationCommands(teamsCmd);
  registerMembershipCommands(teamsCmd);
  registerTeamBookingsCommand(teamsCmd);
  registerTeamInviteCommand(teamsCmd);
  registerOrgScopedTeamCommands(teamsCmd);
}
