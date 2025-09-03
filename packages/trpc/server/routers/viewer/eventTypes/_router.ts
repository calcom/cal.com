import { router } from "../../../trpc";
import { bulkEventFetchRouter } from "./bulkEventFetch/_router";
import { bulkUpdateToDefaultLocationRouter } from "./bulkUpdateToDefaultLocation/_router";
import { createRouter } from "./create/_router";
import { deleteRouter } from "./delete/_router";
import { duplicateRouter } from "./duplicate/_router";
import { getRouter } from "./get/_router";
import { getByViewerRouter } from "./getByViewer/_router";
import { getEventTypesFromGroupRouter } from "./getEventTypesFromGroup/_router";
import { getHashedLinkRouter } from "./getHashedLink/_router";
import { getHashedLinksRouter } from "./getHashedLinks/_router";
import { getTeamAndEventTypeOptionsRouter } from "./getTeamAndEventTypeOptions/_router";
import { getUserEventGroupsRouter } from "./getUserEventGroups/_router";
import { listRouter } from "./list/_router";
import { listWithTeamRouter } from "./listWithTeam/_router";
import { updateRouter } from "./update/_router";

export const eventTypesRouter = router({
  ...getByViewerRouter._def.procedures,
  ...getUserEventGroupsRouter._def.procedures,
  ...getEventTypesFromGroupRouter._def.procedures,
  ...getTeamAndEventTypeOptionsRouter._def.procedures,
  ...listRouter._def.procedures,
  ...listWithTeamRouter._def.procedures,
  ...createRouter._def.procedures,
  ...getRouter._def.procedures,
  ...updateRouter._def.procedures,
  ...deleteRouter._def.procedures,
  ...duplicateRouter._def.procedures,
  ...bulkEventFetchRouter._def.procedures,
  ...bulkUpdateToDefaultLocationRouter._def.procedures,
  ...getHashedLinkRouter._def.procedures,
  ...getHashedLinksRouter._def.procedures,
});
