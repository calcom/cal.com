import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { oneOffMeetingsRouter } from "@calcom/trpc/server/routers/viewer/oneOffMeetings/_router";

export default createNextApiHandler(oneOffMeetingsRouter);

