import type { Command } from "commander";
import {
  eventTypesPrivateLinksControllerCreatePrivateLink as createPrivateLink,
  eventTypesPrivateLinksControllerDeletePrivateLink as deletePrivateLink,
  eventTypesPrivateLinksControllerGetPrivateLinks as getPrivateLinks,
  eventTypesPrivateLinksControllerUpdatePrivateLink as updatePrivateLink,
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
    .description("List all private links for an event type")
    .requiredOption("--event-type-id <eventTypeId>", "Event type ID")
    .option("--json", "Output as JSON")
    .action(async (options: { eventTypeId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const { data: response } = await getPrivateLinks({
          path: { eventTypeId: Number(options.eventTypeId) },
          headers: authHeader(),
        });
        renderPrivateLinkList(response?.data, options);
      });
    });

  privateLinksCmd
    .command("get <linkId>")
    .description("Get a private link by ID")
    .requiredOption("--event-type-id <eventTypeId>", "Event type ID")
    .option("--json", "Output as JSON")
    .action(async (linkId: string, options: { eventTypeId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const { data: response } = await getPrivateLinks({
          path: { eventTypeId: Number(options.eventTypeId) },
          headers: authHeader(),
        });

        const link = response?.data?.find((l) => l.linkId === linkId);
        renderPrivateLink(link, options);
      });
    });
}

function registerPrivateLinksMutationCommands(privateLinksCmd: Command): void {
  privateLinksCmd
    .command("create")
    .description("Create a private link for an event type")
    .requiredOption("--event-type-id <eventTypeId>", "Event type ID")
    .option("--expires-at <date>", "Expiration date (ISO 8601 format, e.g. 2024-12-31T23:59:59.000Z)")
    .option("--max-usage-count <count>", "Maximum number of times the link can be used (default: 1)")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
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
            path: { eventTypeId: Number(options.eventTypeId) },
            body,
            headers: authHeader(),
          });
          renderPrivateLinkCreated(response?.data, options);
        });
      }
    );

  privateLinksCmd
    .command("update <linkId>")
    .description("Update a private link for an event type")
    .requiredOption("--event-type-id <eventTypeId>", "Event type ID")
    .option("--expires-at <date>", "New expiration date (ISO 8601 format)")
    .option("--max-usage-count <count>", "New maximum usage count")
    .option("--json", "Output as JSON")
    .action(
      async (
        linkId: string,
        options: { eventTypeId: string; expiresAt?: string; maxUsageCount?: string; json?: boolean }
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
            path: { eventTypeId: Number(options.eventTypeId), linkId },
            body,
            headers: authHeader(),
          });
          renderPrivateLinkUpdated(response?.data, options);
        });
      }
    );

  privateLinksCmd
    .command("delete <linkId>")
    .description("Delete a private link for an event type")
    .requiredOption("--event-type-id <eventTypeId>", "Event type ID")
    .option("--json", "Output as JSON")
    .action(async (linkId: string, options: { eventTypeId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        await deletePrivateLink({
          path: { eventTypeId: Number(options.eventTypeId), linkId },
          headers: authHeader(),
        });
        renderPrivateLinkDeleted(linkId, options);
      });
    });
}

export function registerPrivateLinksCommand(program: Command): void {
  const privateLinksCmd = program
    .command("private-links")
    .description("Manage private links for event types");
  registerPrivateLinksQueryCommands(privateLinksCmd);
  registerPrivateLinksMutationCommands(privateLinksCmd);
}
