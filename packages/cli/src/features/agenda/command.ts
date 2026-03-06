import type { Command } from "commander";
import { bookingsController20240813GetBookings as getBookings } from "../../generated/sdk.gen";
import { initializeClient } from "../../shared/client";
import { ApiVersion } from "../../shared/constants";
import { withErrorHandling } from "../../shared/errors";
import { apiVersionHeader } from "../../shared/headers";
import { renderAgenda } from "./output";

export function registerAgendaCommand(program: Command): void {
  program
    .command("agenda")
    .description("Show upcoming bookings")
    .option("--take <n>", "Number of bookings to show", "25")
    .option("--json", "Output as JSON")
    .action(async (options: { take: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const { data: response } = await getBookings({
          query: {
            status: ["upcoming"],
            sortStart: "asc",
            take: parseInt(options.take, 10),
          },
          headers: apiVersionHeader(ApiVersion.V2024_08_13),
        });
        renderAgenda(response?.data, options);
      });
    });
}
