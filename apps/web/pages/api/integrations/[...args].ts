import { NextApiHandler, NextApiRequest, NextApiResponse } from "next";

import appStore from "@calcom/app-store";

import { getSession } from "@lib/auth";
import { HttpError } from "@lib/core/http/error";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Check that user is authenticated
  req.session = await getSession({ req });

  if (!req.session?.user?.id) {
    res.status(401).json({ message: "You must be logged in to do this" });
    return;
  }

  const { args } = req.query;

  if (!Array.isArray(args)) {
    return res.status(404).json({ message: `API route not found` });
  }

  const [_appName, apiEndpoint] = args;
  const appName = _appName.split("_").join(""); // Transform `zoom_video` to `zoomvideo`;

  try {
    // TODO: Find a way to dynamically import these modules
    // const app = (await import(`@calcom/${appName}`)).default;
    const app = appStore[appName as keyof typeof appStore];
    if (!(app && "api" in app && apiEndpoint in app.api))
      throw new HttpError({ statusCode: 404, message: `API handler not found` });

    const handler = app.api[apiEndpoint as keyof typeof app.api] as NextApiHandler;

    if (typeof handler !== "function")
      throw new HttpError({ statusCode: 404, message: `API handler not found` });

    const response = await handler(req, res);
    console.log("response", response);

    res.status(200);
  } catch (error) {
    console.error(error);
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return res.status(404).json({ message: `API handler not found` });
  }
};

export default handler;
