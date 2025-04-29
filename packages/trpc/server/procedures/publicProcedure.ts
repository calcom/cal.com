import perfMiddleware from "../middlewares/perfMiddleware";
import { tRPCContext } from "../trpc";

const publicProcedure = tRPCContext.procedure.use(perfMiddleware);

export default publicProcedure;
