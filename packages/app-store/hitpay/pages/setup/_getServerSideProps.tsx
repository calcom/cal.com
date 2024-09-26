import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

import type { IHitPaySetupProps } from "./index";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  console.log("hitpay setup");
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
      type: "hitpay_payment",
      userId: session?.user.id,
    },
  });

  const props: IHitPaySetupProps = {
    email: session?.user?.email ? session.user.email : null,
    apiKey: null,
    saltKey: null,
  };

  if (credentials?.key) {
    const { api_key, salt_key } = credentials.key as {
      api_key?: string;
      salt_key?: string;
    };
    if (api_key) {
      props.apiKey = api_key;
    }
    if (salt_key) {
      props.saltKey = salt_key;
    }
  }

  return {
    props,
  };
};
