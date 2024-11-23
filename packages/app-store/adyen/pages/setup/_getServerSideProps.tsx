import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

import { getAdyenKeys } from "../../lib/getAdyenKeys";
import type { IAdyenSetupProps } from "./index";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const notFound = { notFound: true } as const;

  if (typeof ctx.params?.slug !== "string") return notFound;

  const { req, res } = ctx;
  const session = await getServerSession({ req, res });

  if (!session?.user?.id) {
    const redirect = { redirect: { permanent: false, destination: "/auth/login" } } as const;

    return redirect;
  }

  const credentials = await prisma.credential.findFirst({
    where: {
      type: "adyen_payment",
      userId: session?.user.id,
      invalid: false,
    },
  });

  let clientId, clientSecret;
  try {
    ({ client_id: clientId, client_secret: clientSecret } = await getAdyenKeys());
  } catch (err) {
    clientId = null;
    clientSecret = null;
  }

  const props: IAdyenSetupProps = {
    merchantAccountId: null,
    clientId,
    clientSecret,
  };
  if (credentials?.key) {
    const { merchant_account_id } = credentials.key as {
      merchant_account_id?: string;
    };
    if (merchant_account_id) {
      props.merchantAccountId = merchant_account_id;
    }
  }

  return {
    props,
  };
};
