import type { GetServerSidePropsContext } from "next";

import { appKeysSchema } from "@calcom/app-store/razorpay/zod";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

export interface IRazorpaySetupProps {
  keyId?: string;
  webhookSecret?: string;
  defaultCurrency?: string;
}
export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const notFound = { notFound: true } as const;
  if (typeof ctx.params?.slug !== "string") return notFound;
  const { req } = ctx;
  const session = await getServerSession({ req });
  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }
  const credential = await prisma.credential.findFirst({
    where: {
      userId: session.user.id,
      type: "razorpay_payment",
    },
    select: {
      id: true,
      key: true,
    },
  });
  if (!credential) {
    return { props: {} };
  }
  try {
    const keys = appKeysSchema.parse(credential.key);
    return {
      props: {
        keyId: keys.key_id,
        webhookSecret: keys.webhook_secret,
        defaultCurrency: keys.default_currency,
      } as IRazorpaySetupProps,
    };
  } catch {
    return { props: {} };
  }
};
