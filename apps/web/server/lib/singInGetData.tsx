import { getCsrfToken, getProviders } from "next-auth/react";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import type { LegacyCtx } from "@lib/buildLegacyCtx";

export async function getSignInData(context: LegacyCtx) {
  const { req } = context;

  // @ts-expect-error Type '{ headers: ReadonlyHeaders; cookies: ReadonlyRequestCookies; }' is not assignable to type 'NextApiRequest | IncomingMessage
  const session = await getServerSession({ req });
  // @ts-expect-error Type '{ headers: ReadonlyHeaders; cookies: ReadonlyRequestCookies; }' is not assignable to type 'NextApiRequest | IncomingMessage
  const csrfToken = await getCsrfToken({ req });

  const providers = await getProviders();
  if (session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return {
    props: {
      csrfToken,
      providers: providers ?? [],
    },
  };
}
