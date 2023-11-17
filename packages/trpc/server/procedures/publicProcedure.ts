import captureErrorsMiddleware from "../middlewares/captureErrorsMiddleware";
import { csrfMiddleware } from "../middlewares/csrfMiddleware";
import perfMiddleware from "../middlewares/perfMiddleware";
import { tRPCContext } from "../trpc";

const publicProcedure = tRPCContext.procedure
  .use(captureErrorsMiddleware)
  .use(perfMiddleware)
  .use(csrfMiddleware);

export default publicProcedure;
