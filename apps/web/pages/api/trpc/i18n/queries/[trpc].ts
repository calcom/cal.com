import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { i18nRouter } from "@calcom/trpc/server/routers/viewer/i18n/queries/_router";

export default createNextApiHandler(i18nRouter);
