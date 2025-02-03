import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

import { hitpayCredentialKeysSchema } from "../../lib/hitpayCredentialKeysSchema";
import type { IHitPaySetupProps } from "./index";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const notFound = { notFound: true } as const;

  if (typeof ctx.params?.slug !== "string") return notFound;

  const { req } = ctx;
  const session = await getServerSession({ req });

  if (!session?.user?.id) {
    const redirect = { redirect: { permanent: false, destination: "/auth/login" } } as const;

    return redirect;
  }

  const credentials = await prisma.credential.findFirst({
    where: {
      type: "hitpay_payment",
      userId: session?.user.id,
    },
  });

  let props: IHitPaySetupProps = {
    isSandbox: false,
  };

  if (credentials?.key) {
    const keyParsing = hitpayCredentialKeysSchema.safeParse(credentials.key);
    if (keyParsing.success) {
      props = {
        ...props,
        ...keyParsing.data,
      };
    }
  }

  return {
    props,
  };
};
