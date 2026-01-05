import type { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";

import prisma from "@calcom/prisma";

import { GiphyManager } from "../lib";

const searchSchema = z.object({
  keyword: z.string(),
  offset: z.number().min(0),
});

/**
 * This is an example endpoint for an app, these will run under `/api/integrations/[...args]`
 * @param req
 * @param res
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = req.session?.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
      select: {
        id: true,
        locale: true,
      },
    });
    const locale = user?.locale || "en";
    const { keyword, offset } = req.body;
    const { gifImageUrl, total } = await GiphyManager.searchGiphy(locale, keyword, offset);
    return res.status(200).json({
      image: gifImageUrl,
      // rotate results to 0 offset when no more gifs
      nextOffset: total === offset + 1 ? 0 : offset + 1,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500);
  }
}

function validate(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<NextApiResponse | void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "POST") {
      try {
        searchSchema.parse(req.body);
      } catch (error) {
        if (error instanceof ZodError && error?.name === "ZodError") {
          return res.status(400).json(error?.issues);
        }
        return res.status(402);
      }
    } else {
      return res.status(405);
    }
    await handler(req, res);
  };
}

export default validate(handler);
