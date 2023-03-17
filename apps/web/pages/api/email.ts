import type { NextApiRequest, NextApiResponse } from "next";

import { renderEmail } from "@calcom/emails";
import { getTranslation } from "@calcom/lib/server/i18n";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (process.env.NODE_ENV !== "development") return res.write("Only for development purposes"), res.end();
  const t = await getTranslation("en", "common");

  req.statusCode = 200;

  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cache-Control", "no-cache, no-store, private, must-revalidate");
  res.write(
    renderEmail("SlugReplacementEmail", {
      slug: "managed",
      t,
    })
  );
  res.end();
};

export default handler;
