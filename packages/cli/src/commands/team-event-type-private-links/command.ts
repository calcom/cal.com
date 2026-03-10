import type { Command } from "commander";
import {
  organizationsEventTypesPrivateLinksControllerCreatePrivateLink as createPrivateLink,
  organizationsEventTypesPrivateLinksControllerDeletePrivateLink as deletePrivateLink,
  organizationsEventTypesPrivateLinksControllerGetPrivateLinks as getPrivateLinks,
  organizationsEventTypesPrivateLinksControllerUpdatePrivateLink as updatePrivateLink,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import {
  renderPrivateLink,
  renderPrivateLinkCreated,
  renderPrivateLinkDeleted,
  renderPrivateLinkList,
  renderPrivateLinkUpdated,
} from "./output";

function registerPrivateLinksQueryCommands(privateLinksCmd: Command): void {
  privateLinksCmd
    .command("list")
    .description("List all private links for a team event type")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .requiredOption("--team-id <teamId>", "Team ID")
    .requiredOption("--event-type-id <eventTypeId>", "Event type ID")
    .option("--json", "Output as JSON")
    .action(async (options: { orgId: string; teamId: string; eventTypeId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const { data: response } = await getPrivateLinks({
          path: {
            orgId: Number(options.orgId),
            teamId: Number(options.teamId),
            eventTypeId: Number(options.eventTypeId),
          },
          headers: authHeader(),
        });
        renderPrivateLinkList(response?.data, options);
      });
    });

  privateLinksCmd
    .command("get <linkId>")
    .description("Get a private link by ID")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .requiredOption("--team-id <teamId>", "Team ID")
    .requiredOption("--event-type-id <eventTypeId>", "Event type ID")
    .option("--json", "Output as JSON")
    .action(
      async (
        linkId: string,
        options: { orgId: string; teamId: string; eventTypeId: string; json?: boolean }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const { data: response } = await getPrivateLinks({
            path: {
              orgId: Number(options.orgId),
              teamId: Number(options.teamId),
              eventTypeId: Number(options.eventTypeId),
            },
            headers: authHeader(),
          });

          const link = response?.data?.find((l) => l.linkId === linkId);
          renderPrivateLink(link, options);
        });
      }
    );
}

function registerPrivateLinksMutationCommands(privateLinksCmd: Command): void {
  privateLinksCmd
    .command("create")
    .description("Create a private link for a team event type")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .requiredOption("--team-id <teamId>", "Team ID")
    .requiredOption("--event-type-id <eventTypeId>", "Event type ID")
    .option("--expires-at <date>", "Expiration date (ISO 8601 format, e.g. 2024-12-31T23:59:59.000Z)")
    .option("--max-usage-count <count>", "Maximum number of times the link can be used (default: 1)")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        orgId: string;
        teamId: string;
        eventTypeId: string;
        expiresAt?: string;
        maxUsageCount?: string;
        json?: boolean;
      }) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const body: { expiresAt?: string; maxUsageCount?: number } = {};
          if (options.expiresAt) {
            body.expiresAt = options.expiresAt;
          }
          if (options.maxUsageCount) {
            body.maxUsageCount = Number(options.maxUsageCount);
          }

          const { data: response } = await createPrivateLink({
            path: {
              orgId: Number(options.orgId),
              teamId: Number(options.teamId),
              eventTypeId: Number(options.eventTypeId),
            },
            body,
            headers: authHeader(),
          });
          renderPrivateLinkCreated(response?.data, options);
        });
      }
    );

  privateLinksCmd
    .command("update <linkId>")
    .description("Update a private link for a team event type")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .requiredOption("--team-id <teamId>", "Team ID")
    .requiredOption("--event-type-id <eventTypeId>", "Event type ID")
    .option("--expires-at <date>", "New expiration date (ISO 8601 format)")
    .option("--max-usage-count <count>", "New maximum usage count")
    .option("--json", "Output as JSON")
    .action(
      async (
        linkId: string,
        options: {
          orgId: string;
          teamId: string;
          eventTypeId: string;
          expiresAt?: string;
          maxUsageCount?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const body: { expiresAt?: string; maxUsageCount?: number } = {};
          if (options.expiresAt) {
            body.expiresAt = options.expiresAt;
          }
          if (options.maxUsageCount) {
            body.maxUsageCount = Number(options.maxUsageCount);
          }

          const { data: response } = await updatePrivateLink({
            path: {
              orgId: Number(options.orgId),
              teamId: Number(options.teamId),
              eventTypeId: Number(options.eventTypeId),
              linkId,
            },
            body,
            headers: authHeader(),
          });
          renderPrivateLinkUpdated(response?.data, options);
        });
      }
    );

  privateLinksCmd
    .command("delete <linkId>")
    .description("Delete a private link for a team event type")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .requiredOption("--team-id <teamId>", "Team ID")
    .requiredOption("--event-type-id <eventTypeId>", "Event type ID")
    .option("--json", "Output as JSON")
    .action(
      async (
        linkId: string,
        options: { orgId: string; teamId: string; eventTypeId: string; json?: boolean }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          await deletePrivateLink({
            path: {
              orgId: Number(options.orgId),
              teamId: Number(options.teamId),
              eventTypeId: Number(options.eventTypeId),
              linkId,
            },
            headers: authHeader(),
          });
          renderPrivateLinkDeleted(linkId, options);
        });
      }
    );
}

export function registerTeamEventTypePrivateLinksCommand(program: Command): void {
  const privateLinksCmd = program
    .command("team-event-type-private-links")
    .description("Manage private links for team event types");
  registerPrivateLinksQueryCommands(privateLinksCmd);
  registerPrivateLinksMutationCommands(privateLinksCmd);
}
