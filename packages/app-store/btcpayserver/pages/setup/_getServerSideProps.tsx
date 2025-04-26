import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

import { btcpayCredentialKeysSchema } from "../../lib/btcpayCredentialKeysSchema";
import type { IBTCPaySetupProps } from "./index";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  try {
    const notFound = { notFound: true } as const;
    if (typeof ctx.params?.slug !== "string") return notFound;

    const { req } = ctx;
    const session = await getServerSession({ req });
    if (!session?.user?.id) return { redirect: { permanent: false, destination: "/auth/login" } };

    const credentials = await prisma.credential.findFirst({
      where: {
        type: "btcpayserver_payment",
        userId: session?.user.id,
      },
    });

    let props: IBTCPaySetupProps | undefined;
    if (credentials?.key) {
      const keyParsing = btcpayCredentialKeysSchema.safeParse(credentials.key);
      if (keyParsing.success) {
        props = keyParsing.data;
      }
    }
    return { props: props ?? {} };
  } catch (error) {
    console.error("Error in BTCPay server getServerSideProps:", error);
    return {
      props: {},
    };
  }
};
