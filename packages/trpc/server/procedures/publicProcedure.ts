import perfMiddleware from "../midlewares/perfMiddleware";
import { tRPCContext } from "../trpc";

const publicProcedure = tRPCContext.procedure.use(perfMiddleware);

export default publicProcedure;
