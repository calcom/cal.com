import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { timezonesRouter } from "@calcom/trpc/server/routers/publicViewer/timezones/_router";

export default createNextApiHandler(timezonesRouter, true);
