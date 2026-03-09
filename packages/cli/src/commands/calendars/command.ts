import type { Command } from "commander";
import {
  calendarsControllerCheck as checkCalendar,
  calendarsControllerCheckIcsFeed as checkIcsFeed,
  calendarsControllerCreateIcsFeed as createIcsFeed,
  calendarsControllerDeleteCalendarCredentials as deleteCalendarCredentials,
  calendarsControllerGetBusyTimes as getBusyTimes,
  calendarsControllerRedirect as getCalendarRedirect,
  calendarsControllerGetCalendars as getCalendars,
  calendarsControllerSave as saveCalendar,
  calendarsControllerSyncCredentials as syncCredentials,
} from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import {
  renderBusyTimes,
  renderCalendarCheck,
  renderCalendarCredentialsDeleted,
  renderCalendarList,
  renderCalendarRedirect,
  renderCalendarSaved,
  renderCredentialsSynced,
  renderIcsFeedCheck,
  renderIcsFeedCreated,
} from "./output";

type CalendarType = "google" | "office365";
type CalendarTypeWithApple = "google" | "office365" | "apple";

function registerCalendarQueryCommands(calendarsCmd: Command): void {
  calendarsCmd
    .command("list")
    .description("List connected calendars")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await getCalendars({
          headers: authHeader(),
        });

        renderCalendarList(response?.data, options);
      });
    });

  calendarsCmd
    .command("busy-times")
    .description("Get busy times from calendars")
    .requiredOption("--date-from <date>", "Start date (YYYY-MM-DD)")
    .requiredOption("--date-to <date>", "End date (YYYY-MM-DD)")
    .requiredOption("--timezone <tz>", "Timezone (e.g. Europe/Madrid)")
    .requiredOption("--credential-id <id>", "Credential ID (from 'calendars list')")
    .requiredOption("--external-id <id>", "Calendar external ID (from 'calendars list')")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        dateFrom: string;
        dateTo: string;
        timezone: string;
        credentialId: string;
        externalId: string;
        json?: boolean;
      }) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const { data: response } = await getBusyTimes({
            query: {
              credentialId: Number(options.credentialId),
              externalId: options.externalId,
              dateFrom: options.dateFrom,
              dateTo: options.dateTo,
              timeZone: options.timezone,
            },
            headers: authHeader(),
          });

          renderBusyTimes(response?.data, options);
        });
      }
    );
}

function registerCalendarOAuthCommands(calendarsCmd: Command): void {
  calendarsCmd
    .command("redirect <calendar>")
    .description("Get OAuth redirect URL for a calendar provider (google or office365)")
    .option("--redir <url>", "Redirect URL after successful authorization")
    .option("--dry-run", "Check if credentials already exist without redirecting")
    .option("--json", "Output as JSON")
    .action(async (calendar: string, options: { redir?: string; dryRun?: boolean; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const calendarType = calendar as CalendarType;
        if (calendarType !== "google" && calendarType !== "office365") {
          throw new Error("Calendar must be 'google' or 'office365'");
        }

        const { data: response } = await getCalendarRedirect({
          path: { calendar: calendarType },
          query: {
            isDryRun: options.dryRun ?? false,
            redir: options.redir,
          },
          headers: authHeader(),
        });

        renderCalendarRedirect(response, options);
      });
    });

  calendarsCmd
    .command("save <calendar>")
    .description("Save calendar credentials after OAuth callback (google or office365)")
    .requiredOption("--state <state>", "OAuth state parameter")
    .requiredOption("--code <code>", "OAuth authorization code")
    .option("--json", "Output as JSON")
    .action(async (calendar: string, options: { state: string; code: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const calendarType = calendar as CalendarType;
        if (calendarType !== "google" && calendarType !== "office365") {
          throw new Error("Calendar must be 'google' or 'office365'");
        }

        const { data: response } = await saveCalendar({
          path: { calendar: calendarType },
          query: { state: options.state, code: options.code },
        });

        renderCalendarSaved(response, options);
      });
    });

  calendarsCmd
    .command("check <calendar>")
    .description("Check if calendar credentials are valid (google, office365, or apple)")
    .option("--json", "Output as JSON")
    .action(async (calendar: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const calendarType = calendar as CalendarTypeWithApple;
        if (calendarType !== "google" && calendarType !== "office365" && calendarType !== "apple") {
          throw new Error("Calendar must be 'google', 'office365', or 'apple'");
        }

        const { data: response } = await checkCalendar({
          path: { calendar: calendarType },
          headers: authHeader(),
        });

        renderCalendarCheck(response, options);
      });
    });

  calendarsCmd
    .command("sync-credentials")
    .description("Sync Apple calendar credentials (Apple calendar only)")
    .requiredOption("--username <username>", "Apple ID or app-specific username")
    .requiredOption("--password <password>", "App-specific password")
    .option("--json", "Output as JSON")
    .action(async (options: { username: string; password: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await syncCredentials({
          path: { calendar: "apple" },
          body: { username: options.username, password: options.password },
          headers: authHeader(),
        });

        renderCredentialsSynced(response, options);
      });
    });

  calendarsCmd
    .command("disconnect <calendar>")
    .description("Disconnect a calendar by deleting its credentials")
    .requiredOption("--credential-id <id>", "Credential ID to delete")
    .option("--json", "Output as JSON")
    .action(async (calendar: string, options: { credentialId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const calendarType = calendar as CalendarTypeWithApple;
        if (calendarType !== "google" && calendarType !== "office365" && calendarType !== "apple") {
          throw new Error("Calendar must be 'google', 'office365', or 'apple'");
        }

        const { data: response } = await deleteCalendarCredentials({
          path: { calendar: calendarType },
          body: { id: Number(options.credentialId) },
          headers: authHeader(),
        });

        renderCalendarCredentialsDeleted(response, options);
      });
    });
}

function registerIcsFeedCommands(calendarsCmd: Command): void {
  const icsFeedCmd = calendarsCmd.command("ics-feed").description("Manage ICS feed calendars");

  icsFeedCmd
    .command("check")
    .description("Check if an ICS feed URL is valid")
    .requiredOption("--url <url>", "ICS feed URL to check")
    .option("--json", "Output as JSON")
    .action(async (options: { url: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await checkIcsFeed({
          query: { url: options.url },
          headers: authHeader(),
        });

        renderIcsFeedCheck(response, options);
      });
    });

  icsFeedCmd
    .command("save")
    .description("Save an ICS feed as a calendar")
    .requiredOption("--url <url>", "ICS feed URL")
    .option("--json", "Output as JSON")
    .action(async (options: { url: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();

        const { data: response } = await createIcsFeed({
          body: { urls: [options.url] },
          headers: authHeader(),
        });

        renderIcsFeedCreated(response, options);
      });
    });
}

export function registerCalendarsCommand(program: Command): void {
  const calendarsCmd = program.command("calendars").description("Manage calendars");
  registerCalendarQueryCommands(calendarsCmd);
  registerCalendarOAuthCommands(calendarsCmd);
  registerIcsFeedCommands(calendarsCmd);
}
