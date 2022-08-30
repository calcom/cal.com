import type { NextApiRequest, NextApiResponse } from "next";

import { deleteStripeCustomer } from "@calcom/app-store/stripepayment/lib/customer";
import { deleteWebUser as syncServicesDeleteWebUser } from "@calcom/lib/sync/SyncServiceManager";
import prisma from "@calcom/prisma";

import { getSession } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  if (!session?.user.id) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  if (req.method === "DELETE") {
    // Get user
    const user = await prisma.user.findUnique({
      rejectOnNotFound: true,
      where: {
        id: session.user?.id,
      },
      select: {
        id: true,
        email: true,
        metadata: true,
        username: true,
        createdDate: true,
        name: true,
        plan: true,
      },
    });
    // Delete from stripe
    await deleteStripeCustomer(user).catch(console.warn);
    // Delete from Cal
    await prisma.user.delete({
      where: {
        id: session?.user.id,
      },
    });

    // Sync Services
    syncServicesDeleteWebUser(user);

    return res.status(204).end();
  }
}
