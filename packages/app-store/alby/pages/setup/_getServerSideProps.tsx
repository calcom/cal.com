import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import type { IAlbySetupProps } from "./index";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  if (typeof ctx.params?.slug !== "string") return { notFound: true } as const;

  const { req, res } = ctx;
  const session = await getServerSession({ req, res });

  if (!session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const credentials = await prisma.credential.findFirst({
    where: {
      type: "alby_payment",
      userId: session.user.id,
    },
  });

  const props: IAlbySetupProps = {};
  if (credentials?.key) {
    const { account_lightning_address, account_email } = credentials.key;
    props.email = account_email;
    props.lightningAddress = account_lightning_address;
  }

  return {
    props,
  };
};
