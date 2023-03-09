import type { NextApiHandler } from "next";
import type { Session } from "next-auth";

import type { Credential } from "@calcom/prisma/client";

export type AppDeclarativeHandler = {
  appType: string;
  slug: string;
  variant: string;
  supportsMultipleInstalls: false;
  handlerType: "add";
  createCredential: (arg: { user: Session["user"]; appType: string; slug: string }) => Promise<Credential>;
  supportsMultipleInstalls: boolean;
  redirect?: {
    newTab?: boolean;
    url: string;
  };
};
export type AppHandler = AppDeclarativeHandler | NextApiHandler;
