import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";

import { btcpayCredentialKeysSchema } from "../../lib/btcpayCredentialKeysSchema";

export type IBTCPaySetupProps = z.infer<typeof btcpayCredentialKeysSchema>;

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  try {
    const notFound = { notFound: true } as const;
    if (typeof ctx.params?.slug !== "string") return notFound;

    const { req } = ctx;
    const session = await getServerSession({ req });
    if (!session?.user?.id) return { redirect: { permanent: false, destination: "/auth/login" } };

    const credential = await CredentialRepository.findFirstByUserIdAndType({
      userId: session.user.id,
      type: "btcpayserver_payment",
    });

    let props: IBTCPaySetupProps | undefined;
    if (credential?.key) {
      const keyParsing = btcpayCredentialKeysSchema.safeParse(credential.key);
      if (keyParsing.success) {
        props = keyParsing.data;
      }
    }
    return { props: props ?? {} };
  } catch (error) {
    return {
      props: {},
    };
  }
};
