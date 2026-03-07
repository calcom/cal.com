import type { Command } from "commander";
import {
  organizationsUsersControllerCreateOrganizationUser as createOrgUser,
  organizationsUsersControllerDeleteOrganizationUser as deleteOrgUser,
  organizationsUsersControllerGetOrganizationsUsers as getOrgUsers,
  organizationsUsersControllerUpdateOrganizationUser as updateOrgUser,
} from "../../generated/sdk.gen";
import type { CreateOrganizationUserInput, UpdateOrganizationUserInput } from "../../generated/types.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import {
  renderOrgUserCreated,
  renderOrgUserDeleted,
  renderOrgUserList,
  renderOrgUserUpdated,
} from "./output";

function registerOrgUsersQueryCommands(orgUsersCmd: Command): void {
  orgUsersCmd
    .command("list")
    .description("List all organization users")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--emails <emails>", "Filter by email addresses (comma-separated)")
    .option("--team-ids <teamIds>", "Filter by team IDs (comma-separated)")
    .option("--skip <n>", "Number of users to skip")
    .option("--take <n>", "Number of users to return")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        orgId: string;
        emails?: string;
        teamIds?: string;
        skip?: string;
        take?: string;
        json?: boolean;
      }) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const { data: response } = await getOrgUsers({
            path: { orgId: Number(options.orgId) },
            query: {
              emails: options.emails ? options.emails.split(",") : undefined,
              teamIds: options.teamIds ? options.teamIds.split(",").map(Number) : undefined,
              skip: options.skip ? Number(options.skip) : undefined,
              take: options.take ? Number(options.take) : undefined,
            },
            headers: authHeader(),
          });

          renderOrgUserList(response?.data, options);
        });
      }
    );
}

function registerOrgUsersMutationCommands(orgUsersCmd: Command): void {
  orgUsersCmd
    .command("create")
    .description("Create an organization user")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .requiredOption("--email <email>", "User email address")
    .option("--username <username>", "Username")
    .option("--bio <bio>", "User bio")
    .option("--timezone <tz>", "User timezone")
    .option("--locale <locale>", "User locale")
    .option("--time-format <format>", "Time format (12 or 24)")
    .option("--brand-color <color>", "Brand color in HEX format")
    .option("--dark-brand-color <color>", "Dark brand color in HEX format")
    .option("--hide-branding", "Hide Cal.com branding")
    .option("--avatar-url <url>", "Avatar URL")
    .option("--organization-role <role>", "Organization role (MEMBER, ADMIN, OWNER)")
    .option("--auto-accept", "Auto-accept the user invitation")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        orgId: string;
        email: string;
        username?: string;
        bio?: string;
        timezone?: string;
        locale?: string;
        timeFormat?: string;
        brandColor?: string;
        darkBrandColor?: string;
        hideBranding?: boolean;
        avatarUrl?: string;
        organizationRole?: string;
        autoAccept?: boolean;
        json?: boolean;
      }) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const body: CreateOrganizationUserInput = {
            email: options.email,
          };

          if (options.username) body.username = options.username;
          if (options.bio) body.bio = options.bio;
          if (options.timezone) body.timeZone = options.timezone;
          if (options.locale) body.locale = options.locale;
          if (options.timeFormat) body.timeFormat = Number(options.timeFormat);
          if (options.brandColor) body.brandColor = options.brandColor;
          if (options.darkBrandColor) body.darkBrandColor = options.darkBrandColor;
          if (options.hideBranding !== undefined) body.hideBranding = options.hideBranding;
          if (options.avatarUrl) body.avatarUrl = options.avatarUrl;
          if (options.organizationRole) {
            body.organizationRole =
              options.organizationRole as CreateOrganizationUserInput["organizationRole"];
          }
          if (options.autoAccept !== undefined) body.autoAccept = options.autoAccept;

          const { data: response } = await createOrgUser({
            path: { orgId: Number(options.orgId) },
            body,
            headers: authHeader(),
          });

          renderOrgUserCreated(response?.data, options);
        });
      }
    );

  orgUsersCmd
    .command("update <userId>")
    .description("Update an organization user")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(
      async (
        userId: string,
        options: {
          orgId: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const body: UpdateOrganizationUserInput = {};

          const { data: response } = await updateOrgUser({
            path: { orgId: Number(options.orgId), userId: Number(userId) },
            body,
            headers: authHeader(),
          });

          renderOrgUserUpdated(response?.data, options);
        });
      }
    );

  orgUsersCmd
    .command("delete <userId>")
    .description("Delete an organization user")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (userId: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        await deleteOrgUser({
          path: { orgId: Number(options.orgId), userId: Number(userId) },
          headers: authHeader(),
        });

        renderOrgUserDeleted(userId, options);
      });
    });
}

export function registerOrgUsersCommand(program: Command): void {
  const orgUsersCmd = program.command("org-users").description("Manage organization users");
  registerOrgUsersQueryCommands(orgUsersCmd);
  registerOrgUsersMutationCommands(orgUsersCmd);
}
