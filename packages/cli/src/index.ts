#!/usr/bin/env node
import process from "node:process";
import { Command } from "commander";
import { registerAgendaCommand } from "./features/agenda";
import { registerApiKeysCommand } from "./features/api-keys";
import { registerBookingsCommand } from "./features/bookings";
import { registerCalendarsCommand } from "./features/calendars";
import { registerConferencingCommand } from "./features/conferencing";
import { registerDestinationCalendarsCommand } from "./features/destination-calendars";
import { registerEventTypeWebhooksCommand } from "./features/event-type-webhooks";
import { registerEventTypesCommand } from "./features/event-types";
import { registerLoginCommand, registerLogoutCommand } from "./features/login";
import { registerMeCommand } from "./features/me";
import { registerOooCommand } from "./features/ooo";
import { registerPrivateLinksCommand } from "./features/private-links";
import { registerSchedulesCommand } from "./features/schedules";
import { registerSelectedCalendarsCommand } from "./features/selected-calendars";
import { registerSlotsCommand } from "./features/slots";
import { registerTeamEventTypeWebhooksCommand } from "./features/team-event-type-webhooks";
import { registerTeamEventTypesCommand } from "./features/team-event-types";
import { registerTeamsCommand } from "./features/teams";
import { registerTimezonesCommand } from "./features/timezones";
import { registerWebhooksCommand } from "./features/webhooks";

const program: Command = new Command();

program
  .name("calcom")
  .description("Cal.com CLI - Manage your Cal.com account from the command line")
  .version("0.0.1");

registerLoginCommand(program);
registerLogoutCommand(program);
registerMeCommand(program);
registerAgendaCommand(program);
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
registerTeamsCommand(program);
registerTeamEventTypesCommand(program);
registerEventTypeWebhooksCommand(program);
registerTeamEventTypeWebhooksCommand(program);
registerOooCommand(program);
registerPrivateLinksCommand(program);

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
