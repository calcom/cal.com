import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { calIdContactsRouter } from "@calcom/trpc/server/routers/viewer/calIdContacts/_router";

export default createNextApiHandler(calIdContactsRouter);
