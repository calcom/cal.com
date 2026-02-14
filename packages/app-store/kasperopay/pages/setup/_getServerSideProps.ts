import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

export interface IKasperoPaySetupProps {
  merchantId: string | null;
}

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
      type: "kasperopay_payment",
      userId: session?.user.id,
    },
  });

  const props: IKasperoPaySetupProps = {
    merchantId: null,
  };

  if (credentials?.key) {
    const { merchant_id } = credentials.key as {
      merchant_id?: string;
    };
    if (merchant_id) {
      props.merchantId = merchant_id;
    }
  }

  return {
    props,
  };
};
