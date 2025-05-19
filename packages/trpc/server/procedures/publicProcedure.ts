import perfMiddleware from "../middlewares/perfMiddleware";
import prismaMiddleware from "../middlewares/prismaMiddleware";
import { tRPCContext } from "../trpc";

const publicProcedure = tRPCContext.procedure.use(perfMiddleware).use(prismaMiddleware);

export default publicProcedure;
