import { NextApiRequest, NextApiResponse } from 'next';
import { createOpenApiNextHandler } from 'trpc-openapi';

import { createContext } from "@calcom/trpc/server/createContext";
import { featureFlagRouter } from "@calcom/features/flags/server/router";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Handle incoming OpenAPI requests
  return createOpenApiNextHandler({
    router: featureFlagRouter,
    createContext,
  })(req, res);
};

export default handler;
