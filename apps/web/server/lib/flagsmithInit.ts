import { createFlagsmithInstance } from "flagsmith/isomorphic";
import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { defaultFlags } from "@calcom/features/flagsmith/config";

const FLAGSMITH_ENVIRONMENT_ID = process.env.FLAGSMITH_ENVIRONMENT_ID;
export async function flagsmithInit(context: GetServerSidePropsContext) {
  const session = await getServerSession({ req: context.req, res: context.res });
  const flagsmithSSR = createFlagsmithInstance();
  await flagsmithSSR.init({
    environmentID: FLAGSMITH_ENVIRONMENT_ID,
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
