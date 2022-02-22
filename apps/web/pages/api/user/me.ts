import type { NextApiRequest, NextApiResponse } from "next";

import { deleteStripeCustomer } from "@ee/lib/stripe/customer";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

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
        email: true,
        metadata: true,
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

    return res.status(204).end();
  }
}
