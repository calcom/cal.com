import type { Command } from "commander";
import {
  organizationsMembershipsControllerCreateMembership as createMembership,
  organizationsMembershipsControllerDeleteMembership as deleteMembership,
  organizationsMembershipsControllerGetAllMemberships as getAllMemberships,
  organizationsMembershipsControllerGetOrgMembership as getMembership,
  organizationsMembershipsControllerUpdateMembership as updateMembership,
} from "../../generated/sdk.gen";
import type { CreateOrgMembershipDto, UpdateOrgMembershipDto } from "../../generated/types.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import {
  renderOrgMembership,
  renderOrgMembershipCreated,
  renderOrgMembershipDeleted,
  renderOrgMembershipList,
  renderOrgMembershipUpdated,
} from "./output";

function registerQueryCommands(orgMembershipsCmd: Command): void {
  orgMembershipsCmd
    .command("list")
    .description("List all organization memberships")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--skip <n>", "Number of items to skip")
    .option("--take <n>", "Maximum number of items to return")
    .option("--json", "Output as JSON")
    .action(async (options: { orgId: string; skip?: string; take?: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getAllMemberships({
          path: { orgId: Number(options.orgId) },
          query: {
            skip: options.skip ? Number(options.skip) : undefined,
            take: options.take ? Number(options.take) : undefined,
          },
          headers: authHeader(),
        });

        renderOrgMembershipList(response?.data, options);
      });
    });

  orgMembershipsCmd
    .command("get <membershipId>")
    .description("Get an organization membership by ID")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (membershipId: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getMembership({
          path: { orgId: Number(options.orgId), membershipId: Number(membershipId) },
          headers: authHeader(),
        });

        renderOrgMembership(response?.data, options);
      });
    });
}

function registerMutationCommands(orgMembershipsCmd: Command): void {
  orgMembershipsCmd
    .command("create")
    .description("Create an organization membership")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .requiredOption("--user-id <id>", "User ID to add")
    .requiredOption("--role <role>", "Member role (MEMBER, ADMIN, OWNER)")
    .option("--accepted", "Mark membership as accepted")
    .option("--disable-impersonation", "Disable impersonation for this member")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        orgId: string;
        userId: string;
        role: string;
        accepted?: boolean;
        disableImpersonation?: boolean;
        json?: boolean;
      }) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const body: CreateOrgMembershipDto = {
            userId: Number(options.userId),
            role: options.role as CreateOrgMembershipDto["role"],
            accepted: options.accepted ?? false,
            disableImpersonation: options.disableImpersonation ?? false,
          };

          const { data: response } = await createMembership({
            path: { orgId: Number(options.orgId) },
            body,
            headers: authHeader(),
          });

          renderOrgMembershipCreated(response?.data, options);
        });
      }
    );

  orgMembershipsCmd
    .command("update <membershipId>")
    .description("Update an organization membership")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--role <role>", "Member role (MEMBER, ADMIN, OWNER)")
    .option("--accepted <value>", "Membership accepted (true/false)")
    .option("--disable-impersonation <value>", "Disable impersonation (true/false)")
    .option("--json", "Output as JSON")
    .action(
      async (
        membershipId: string,
        options: {
          orgId: string;
          role?: string;
          accepted?: string;
          disableImpersonation?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const body: UpdateOrgMembershipDto = {};

          if (options.role) body.role = options.role as UpdateOrgMembershipDto["role"];
          if (options.accepted !== undefined) body.accepted = options.accepted === "true";
          if (options.disableImpersonation !== undefined)
            body.disableImpersonation = options.disableImpersonation === "true";

          const { data: response } = await updateMembership({
            path: { orgId: Number(options.orgId), membershipId: Number(membershipId) },
            body,
            headers: authHeader(),
          });

          renderOrgMembershipUpdated(response?.data, options);
        });
      }
    );

  orgMembershipsCmd
    .command("delete <membershipId>")
    .description("Delete an organization membership")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (membershipId: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await deleteMembership({
          path: { orgId: Number(options.orgId), membershipId: Number(membershipId) },
          headers: authHeader(),
        });

        renderOrgMembershipDeleted(response?.data, membershipId, options);
      });
    });
}

export function registerOrgMembershipsCommand(program: Command): void {
  const orgMembershipsCmd = program.command("org-memberships").description("Manage organization memberships");
  registerQueryCommands(orgMembershipsCmd);
  registerMutationCommands(orgMembershipsCmd);
}
