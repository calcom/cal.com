import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

import { getAlbyKeys } from "../../lib/getAlbyKeys";
import type { IAlbySetupProps } from "./index";

export const getServerSideProps = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getServerSession({ req, res });

  if (!session?.user?.id) {
    return res.writeHead(401).end();
  }

  const credentials = await prisma.credential.findFirst({
    where: {
      type: "alby_payment",
      userId: session.user.id,
    },
  });

  const { client_id: clientId, client_secret: clientSecret } = await getAlbyKeys();

  const props: IAlbySetupProps = {
    email: null,
    lightningAddress: null,
    clientId,
    clientSecret,
  };
  if (credentials?.key) {
    const { account_lightning_address, account_email } = credentials.key as {
      account_lightning_address?: string;
      account_email?: string;
    };
    if (account_lightning_address) {
      props.lightningAddress = account_lightning_address;
    }
    if (account_email) {
      props.email = account_email;
    }
  }

  return {
    props,
  };
};
