import { NextApiHandler, NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import { HttpError } from "@lib/core/http/error";

function getSlugFromLegacy(legacySlug) {
  const oldTypes = ["video", "other", "calendar", "web3", "payment", "messaging"];

  // There can be two types of legacy slug
  // - zoom_video
  // - zoomvideo

  // Transform `zoom_video` to `zoomvideo`;
  let slug = legacySlug.split("_").join("");

  // Transform zoomvideo to zoom
  oldTypes.some((type) => {
    const matcher = new RegExp(`(.+)${type}$`);
    if (legacySlug.match(matcher)) {
      slug = legacySlug.replace(matcher, "$1");
      return true;
    }
  });
  return slug;
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Check that user is authenticated
  req.session = await getSession({ req });

  const { args } = req.query;

  if (!Array.isArray(args)) {
    return res.status(404).json({ message: `API route not found` });
  }

  const [_appName, apiEndpoint] = args;
  const appName = getSlugFromLegacy(_appName);
  try {
    /* Absolute path didn't work */
    const handlerMap = (await import("@calcom/app-store/apps.generated")).apiHandlers;
    const handlerKey = appName as keyof typeof handlerMap;
    console.log(handlerKey);
    const handlers = await handlerMap[handlerKey];
    const handler = handlers[apiEndpoint as keyof typeof handlers] as NextApiHandler;

    if (typeof handler !== "function")
      throw new HttpError({ statusCode: 404, message: `API handler not found` });

    await handler(req, res);

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
