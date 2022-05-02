import { NextApiHandler, NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import { HttpError } from "@lib/core/http/error";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Check that user is authenticated
  req.session = await getSession({ req });

  const { args } = req.query;

  if (!Array.isArray(args)) {
    return res.status(404).json({ message: `API route not found` });
  }

  const [_appName, apiEndpoint] = args;
  const appName = _appName.split("_").join(""); // Transform `zoom_video` to `zoomvideo`;

  try {
    const handler = (await import(`@calcom/app-store/${appName}/api/${apiEndpoint}`))
      .default as NextApiHandler;

    if (typeof handler !== "function")
      throw new HttpError({ statusCode: 404, message: `API handler not found` });

    const response = await handler(req, res);

    return res.status(200);
  } catch (error) {
    console.error(error);
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return res.status(404).json({ message: `API handler not found` });
  }
};

export default handler;
