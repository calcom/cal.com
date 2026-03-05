#!/usr/bin/env node
import process from "node:process";
import { Command } from "commander";
import { registerAgendaCommand } from "./commands/agenda";
import { registerApiKeysCommand } from "./commands/api-key";
import { registerCalendarsCommand } from "./commands/calendars";
import { registerConferencingCommand } from "./commands/conferencing";
import { registerDestinationCalendarsCommand } from "./commands/destination-calendars";
import { registerEventTypesCommand } from "./commands/event-types";
import { registerLoginCommand, registerLogoutCommand } from "./commands/login";
import { registerOooCommand } from "./commands/ooo";
import { registerBookingsCommand } from "./features/bookings";
import { registerMeCommand } from "./features/me";
import { registerPrivateLinksCommand } from "./commands/private-links";
import { registerSchedulesCommand } from "./commands/schedules";
import { registerSelectedCalendarsCommand } from "./commands/selected-calendars";
import { registerSlotsCommand } from "./commands/slots";
import { registerTimezonesCommand } from "./commands/timezones";
import { registerWebhooksCommand } from "./commands/webhooks";

const program: Command = new Command();

program
  .name("calcom")
  .description("Cal.com CLI - Manage your Cal.com account from the command line")
  .version("0.0.1");

// Auth commands
registerLoginCommand(program);
registerLogoutCommand(program);

// Profile
registerMeCommand(program);

// Agenda (shortcut for upcoming bookings)
registerAgendaCommand(program);

// Resource commands
registerBookingsCommand(program);
registerEventTypesCommand(program);
registerSchedulesCommand(program);
registerCalendarsCommand(program);
registerWebhooksCommand(program);
registerSlotsCommand(program);
registerConferencingCommand(program);
registerDestinationCalendarsCommand(program);
registerSelectedCalendarsCommand(program);
registerApiKeysCommand(program);
registerTimezonesCommand(program);
registerOooCommand(program);
registerPrivateLinksCommand(program);

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
