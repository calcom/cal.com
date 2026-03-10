import type { Command } from "commander";
import {
  organizationsOrganizationsControllerCreateOrganization as createManagedOrg,
  organizationsOrganizationsControllerDeleteOrganization as deleteManagedOrg,
  organizationsOrganizationsControllerGetOrganization as getManagedOrg,
  organizationsOrganizationsControllerGetOrganizations as getManagedOrgs,
  organizationsOrganizationsControllerUpdateOrganization as updateManagedOrg,
} from "../../generated/sdk.gen";
import type { CreateOrganizationInput, UpdateOrganizationInput } from "../../generated/types.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import {
  renderManagedOrg,
  renderManagedOrgCreated,
  renderManagedOrgDeleted,
  renderManagedOrgList,
  renderManagedOrgUpdated,
} from "./output";

function registerManagedOrgsQueryCommands(managedOrgsCmd: Command): void {
  managedOrgsCmd
    .command("list")
    .description("List all managed organizations")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--slug <slug>", "Filter by slug")
    .option("--metadata-key <key>", "Filter by metadata key")
    .option("--metadata-value <value>", "Filter by metadata value")
    .option("--skip <n>", "Number of organizations to skip")
    .option("--take <n>", "Number of organizations to return")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        orgId: string;
        slug?: string;
        metadataKey?: string;
        metadataValue?: string;
        skip?: string;
        take?: string;
        json?: boolean;
      }) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);

          const { data: response } = await getManagedOrgs({
            path: { orgId },
            query: {
              slug: options.slug,
              metadataKey: options.metadataKey,
              metadataValue: options.metadataValue,
              skip: options.skip ? Number(options.skip) : undefined,
              take: options.take ? Number(options.take) : undefined,
            },
          });

          renderManagedOrgList(response?.data, options);
        });
      }
    );

  managedOrgsCmd
    .command("get <managedOrgId>")
    .description("Get a managed organization by ID")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (managedOrgId: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = Number(options.orgId);

        const { data: response } = await getManagedOrg({
          path: { orgId, managedOrganizationId: Number(managedOrgId) },
        });

        renderManagedOrg(response?.data, options);
      });
    });
}

function registerManagedOrgsMutationCommands(managedOrgsCmd: Command): void {
  managedOrgsCmd
    .command("create")
    .description("Create a managed organization")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .requiredOption("--name <name>", "Name of the managed organization")
    .option("--slug <slug>", "Slug for the managed organization (kebab-case)")
    .option("--api-key-days-valid <days>", "API key validity in days (default: 30)")
    .option("--api-key-never-expires", "Set API key to never expire")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        orgId: string;
        name: string;
        slug?: string;
        apiKeyDaysValid?: string;
        apiKeyNeverExpires?: boolean;
        json?: boolean;
      }) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);

          const body: CreateOrganizationInput = {
            name: options.name,
          };

          if (options.slug) body.slug = options.slug;
          if (options.apiKeyDaysValid) body.apiKeyDaysValid = Number(options.apiKeyDaysValid);
          if (options.apiKeyNeverExpires !== undefined) body.apiKeyNeverExpires = options.apiKeyNeverExpires;

          const { data: response } = await createManagedOrg({
            path: { orgId },
            body,
          });

          renderManagedOrgCreated(response?.data, options);
        });
      }
    );

  managedOrgsCmd
    .command("update <managedOrgId>")
    .description("Update a managed organization")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--name <name>", "New name for the managed organization")
    .option("--json", "Output as JSON")
    .action(
      async (
        managedOrgId: string,
        options: {
          orgId: string;
          name?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);

          const body: UpdateOrganizationInput = {};

          if (options.name) body.name = options.name;

          const { data: response } = await updateManagedOrg({
            path: { orgId, managedOrganizationId: Number(managedOrgId) },
            body,
          });

          renderManagedOrgUpdated(response?.data, options);
        });
      }
    );

  managedOrgsCmd
    .command("delete <managedOrgId>")
    .description("Delete a managed organization")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (managedOrgId: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = Number(options.orgId);

        await deleteManagedOrg({
          path: { orgId, managedOrganizationId: Number(managedOrgId) },
        });

        renderManagedOrgDeleted(managedOrgId, options);
      });
    });
}

export function registerManagedOrgsCommand(program: Command): void {
  const managedOrgsCmd = program.command("managed-orgs").description("Manage managed organizations");
  registerManagedOrgsQueryCommands(managedOrgsCmd);
  registerManagedOrgsMutationCommands(managedOrgsCmd);
}
