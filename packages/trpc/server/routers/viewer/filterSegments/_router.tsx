import { router } from "@calcom/trpc/server/trpc";

import authedProcedure from "../../../procedures/authedProcedure";
import { createHandler } from "./create.handler";
import { ZCreateFilterSegmentInputSchema } from "./create.schema";
import { deleteHandler } from "./delete.handler";
import { ZDeleteFilterSegmentInputSchema } from "./delete.schema";
import { listHandler } from "./list.handler";
import { ZListFilterSegmentsInputSchema } from "./list.schema";
import { updateHandler } from "./update.handler";
import { ZUpdateFilterSegmentInputSchema } from "./update.schema";

export const filterSegmentsRouter = router({
  list: authedProcedure.input(ZListFilterSegmentsInputSchema).query(listHandler),
  create: authedProcedure.input(ZCreateFilterSegmentInputSchema).mutation(createHandler),
  update: authedProcedure.input(ZUpdateFilterSegmentInputSchema).mutation(updateHandler),
  delete: authedProcedure.input(ZDeleteFilterSegmentInputSchema).mutation(deleteHandler),
});
