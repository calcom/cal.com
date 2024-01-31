import type { NextApiRequest, NextApiResponse } from "next";

import { renderEmail } from "@calcom/emails";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (IS_PRODUCTION) return res.write("Only for development purposes"), res.end();
  const t = await getTranslation("en", "common");

  res.statusCode = 200;

  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cache-Control", "no-cache, no-store, private, must-revalidate");
  res.write(
    await renderEmail("VerifyEmailChangeEmail", {
      language: t,
      user: {
        name: "sean",
        emailFrom: "X@cal.com",
        emailTo: "sean@cal.com",
      },
      verificationEmailLink: "XXXX.com",
    })
  );
  res.end();
};

export default handler;
