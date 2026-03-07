import type { Command } from "commander";
import {
  teamsEventTypesControllerCreateTeamEventType as createTeamEventType,
  teamsEventTypesControllerDeleteTeamEventType as deleteTeamEventType,
  teamsEventTypesControllerGetTeamEventType as getTeamEventType,
  teamsEventTypesControllerGetTeamEventTypes as getTeamEventTypes,
  teamsEventTypesControllerUpdateTeamEventType as updateTeamEventType,
} from "../../generated/sdk.gen";
import type { CreateTeamEventTypeInput_2024_06_14 } from "../../generated/types.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import {
  renderTeamEventType,
  renderTeamEventTypeCreated,
  renderTeamEventTypeDeleted,
  renderTeamEventTypeList,
  renderTeamEventTypeUpdated,
} from "./output";

function registerTeamEventTypeQueryCommands(teamEventTypesCmd: Command): void {
  teamEventTypesCmd
    .command("list <teamId>")
    .description("List all team event types")
    .option("--event-slug <slug>", "Filter by event slug")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, options: { eventSlug?: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getTeamEventTypes({
          path: { teamId: Number(teamId) },
          query: { eventSlug: options.eventSlug },
        });

        renderTeamEventTypeList(response?.data, options);
      });
    });

  teamEventTypesCmd
    .command("get <teamId> <eventTypeId>")
    .description("Get a team event type by ID")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, eventTypeId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getTeamEventType({
          path: { teamId: Number(teamId), eventTypeId: Number(eventTypeId) },
          headers: authHeader(),
        });

        renderTeamEventType(response?.data, options);
      });
    });
}

function registerTeamEventTypeMutationCommands(teamEventTypesCmd: Command): void {
  teamEventTypesCmd
    .command("create <teamId>")
    .description("Create a team event type")
    .requiredOption("--title <title>", "Event type title")
    .requiredOption("--slug <slug>", "Event type slug")
    .requiredOption("--length <minutes>", "Duration in minutes")
    .requiredOption("--scheduling-type <type>", "Scheduling type (COLLECTIVE, ROUND_ROBIN, MANAGED)")
    .option("--description <desc>", "Description")
    .option("--hosts <userIds>", "Host user IDs (comma-separated)")
    .option("--assign-all-team-members", "Assign all team members as hosts")
    .option("--hidden", "Create as hidden")
    .option("--disable-guests", "Disable guests")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        options: {
          title: string;
          slug: string;
          length: string;
          schedulingType: string;
          description?: string;
          hosts?: string;
          assignAllTeamMembers?: boolean;
          hidden?: boolean;
          disableGuests?: boolean;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const body: CreateTeamEventTypeInput_2024_06_14 = {
            title: options.title,
            slug: options.slug,
            lengthInMinutes: Number(options.length),
            schedulingType: options.schedulingType as CreateTeamEventTypeInput_2024_06_14["schedulingType"],
          };

          if (options.description) body.description = options.description;
          if (options.hidden) body.hidden = options.hidden;
          if (options.disableGuests) body.disableGuests = options.disableGuests;
          if (options.assignAllTeamMembers) body.assignAllTeamMembers = options.assignAllTeamMembers;
          if (options.hosts) {
            body.hosts = options.hosts.split(",").map((id) => ({
              userId: Number(id.trim()),
              mandatory: false,
              priority: "medium" as const,
            }));
          }

          const { data: response } = await createTeamEventType({
            path: { teamId: Number(teamId) },
            body,
            headers: authHeader(),
          });

          renderTeamEventTypeCreated(response?.data, options);
        });
      }
    );

  teamEventTypesCmd
    .command("update <teamId> <eventTypeId>")
    .description("Update a team event type")
    .option("--title <title>", "New title")
    .option("--slug <slug>", "New slug")
    .option("--length <minutes>", "New duration in minutes")
    .option("--description <desc>", "New description")
    .option("--hidden <value>", "Set hidden (true/false)")
    .option("--disable-guests <value>", "Disable guests (true/false)")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        eventTypeId: string,
        options: {
          title?: string;
          slug?: string;
          length?: string;
          description?: string;
          hidden?: string;
          disableGuests?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const body: Record<string, unknown> = {};
          if (options.title) body.title = options.title;
          if (options.slug) body.slug = options.slug;
          if (options.length) body.lengthInMinutes = Number(options.length);
          if (options.description) body.description = options.description;
          if (options.hidden !== undefined) body.hidden = options.hidden === "true";
          if (options.disableGuests !== undefined) body.disableGuests = options.disableGuests === "true";

          const { data: response } = await updateTeamEventType({
            path: { teamId: Number(teamId), eventTypeId: Number(eventTypeId) },
            body,
            headers: authHeader(),
          });

          renderTeamEventTypeUpdated(response?.data, options);
        });
      }
    );

  teamEventTypesCmd
    .command("delete <teamId> <eventTypeId>")
    .description("Delete a team event type")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, eventTypeId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        await deleteTeamEventType({
          path: { teamId: Number(teamId), eventTypeId: Number(eventTypeId) },
          headers: authHeader(),
        });

        renderTeamEventTypeDeleted(eventTypeId, options);
      });
    });
}

export function registerTeamEventTypesCommand(program: Command): void {
  const teamEventTypesCmd = program.command("team-event-types").description("Manage team event types");
  registerTeamEventTypeQueryCommands(teamEventTypesCmd);
  registerTeamEventTypeMutationCommands(teamEventTypesCmd);
}
