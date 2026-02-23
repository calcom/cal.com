import chalk from "chalk";
import type { Command } from "commander";
import { apiRequest } from "../lib/api";
import { handleOutput, outputTable } from "../lib/output";

interface BookingAttendee {
  name: string;
  email: string;
  timeZone: string;
}

interface Booking {
  id: number;
  uid: string;
  title: string;
  status: string;
  start: string;
  end: string;
  duration: number;
  attendees: BookingAttendee[];
  meetingUrl?: string;
  location?: string;
}

function formatAgendaRow(booking: Booking): string[] {
  const start = new Date(booking.start);
  const end = new Date(booking.end);

  const now = new Date();
  const isToday = start.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = start.toDateString() === tomorrow.toDateString();

  let dateStr: string;
  if (isToday) {
    dateStr = chalk.green("Today");
  } else if (isTomorrow) {
    dateStr = chalk.yellow("Tomorrow");
  } else {
    dateStr = start.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  const timeStr = `${start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  const attendees = booking.attendees?.map((a) => a.name || a.email).join(", ") || "";
  const location = booking.meetingUrl || booking.location || "";

  return [dateStr, timeStr, booking.title || "", attendees, location];
}

export function registerAgendaCommand(program: Command): void {
  program
    .command("agenda")
    .description("Show upcoming bookings")
    .option("--take <n>", "Number of bookings to show", "25")
    .option("--json", "Output as JSON")
    .action(async (options: { take: string; json?: boolean }) => {
      const response = await apiRequest<Booking[]>("/v2/bookings", {
        query: {
          status: "upcoming",
          sortStart: "asc",
          take: options.take,
        },
      });

      handleOutput(response.data, options, (data) => {
        if (!data || data.length === 0) {
          console.log(chalk.dim("No upcoming bookings."));
          return;
        }

        console.log(chalk.bold("\nUpcoming Bookings\n"));
        outputTable(["Date", "Time", "Title", "Attendees", "Location"], data.map(formatAgendaRow));
        console.log();
      });
    });
}
