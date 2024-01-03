import { createFlagsmithInstance } from "flagsmith/isomorphic";
import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { defaultFlags } from "@calcom/features/flagsmith/config";

export async function flagsmithInit(context: GetServerSidePropsContext) {
  const session = await getServerSession({ req: context.req, res: context.res });
  console.log("session: ", session);
  const flagsmithSSR = createFlagsmithInstance();
  await flagsmithSSR.init({
    environmentID: "mXywZJgm9hKEDUfwmspLVT",
    identity: session?.user.email,
    traits: {
      organization: session?.user.org?.name,
    },
    defaultFlags: defaultFlags,
  });
  return {
    flagsmithState: flagsmithSSR.getState(),
    session,
  };
}
