import type { Command } from "commander";
import { meControllerGetMe as getMe, meControllerUpdateMe as updateMe } from "../../generated/sdk.gen";
import type { UpdateManagedUserInput } from "../../generated/types.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import { renderProfile, renderProfileUpdated } from "./output";

export function registerMeCommand(program: Command): void {
  const meCmd = program.command("me").alias("whoami").description("Manage your Cal.com profile");

  meCmd
    .command("show", { isDefault: true })
    .description("Get your Cal.com profile")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const { data: response } = await getMe({ headers: authHeader() });
        renderProfile(response?.data, options);
      });
    });

  meCmd
    .command("update")
    .description("Update your Cal.com profile")
    .option("--name <name>", "Your display name")
    .option("--email <email>", "Your email address")
    .option("--bio <bio>", "Your bio/description")
    .option("--timezone <tz>", "Your timezone (e.g., America/New_York)")
    .option("--time-format <format>", "Time format: 12 or 24")
    .option("--week-start <day>", "Week start day (Monday, Tuesday, etc.)")
    .option("--locale <locale>", "Locale (e.g., en, es, fr)")
    .option("--avatar-url <url>", "Avatar image URL")
    .option("--default-schedule-id <id>", "Default schedule ID")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        name?: string;
        email?: string;
        bio?: string;
        timezone?: string;
        timeFormat?: string;
        weekStart?: string;
        locale?: string;
        avatarUrl?: string;
        defaultScheduleId?: string;
        json?: boolean;
      }) => {
        await withErrorHandling(async () => {
          await initializeClient();

          const body: UpdateManagedUserInput = {};

          if (options.name) body.name = options.name;
          if (options.email) body.email = options.email;
          if (options.bio) body.bio = options.bio;
          if (options.timezone) body.timeZone = options.timezone;
          if (options.timeFormat) body.timeFormat = Number(options.timeFormat) as 12 | 24;
          if (options.weekStart) body.weekStart = options.weekStart as UpdateManagedUserInput["weekStart"];
          if (options.locale) body.locale = options.locale as UpdateManagedUserInput["locale"];
          if (options.avatarUrl) body.avatarUrl = options.avatarUrl;
          if (options.defaultScheduleId) body.defaultScheduleId = Number(options.defaultScheduleId);

          const { data: response } = await updateMe({
            body,
            headers: authHeader(),
          });

          renderProfileUpdated(response?.data, options);
        });
      }
    );
}
