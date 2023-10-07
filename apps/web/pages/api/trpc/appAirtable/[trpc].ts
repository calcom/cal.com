import appAirtable from "@calcom/app-store/airtable/trpc/_router";
import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";

export default createNextApiHandler(appAirtable);
