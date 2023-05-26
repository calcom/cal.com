import { NextApiRequest, NextApiResponse } from 'next';
import { createOpenApiNextHandler } from 'trpc-openapi';
import { createContext } from "@calcom/trpc/server/createContext";
import { viewerRouter } from "@calcom/trpc/server/routers/viewer/_router";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  return createOpenApiNextHandler({
    router: viewerRouter,
    createContext,
  })(req, res);
};

export default handler;
