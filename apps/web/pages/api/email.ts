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
    renderEmail("VerifyAccountEmail", {
      language: t,
      user: {
        name: "Pro Example",
        email: "pro@example.com",
      },
      verificationEmailLink:
        "http://localhost:3000/api/auth/verify-email?token=b91af0eee5a9a24a8d83a3d3d6a58c1606496e94ced589441649273c66100f5b",
    })
  );
  res.end();
};

export default handler;
