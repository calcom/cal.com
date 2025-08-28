import type { NextApiRequest, NextApiResponse } from "next";

import { RAZORPAY_CLIENT_ID, RAZORPAY_REDIRECT_URL, RAZORPAY_STATE_KEY } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import config from "../config.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }
  const appType = config.type;
  try {
    if (!RAZORPAY_CLIENT_ID || !RAZORPAY_REDIRECT_URL || !RAZORPAY_STATE_KEY) {
      throw new Error("Razorpay credentials not defined properly");
    }

    if (req.query.teamId) {
      const teamOwner = await prisma.membership.findFirst({
        where: {
          teamId: parseInt(req.query.teamId as string),
          role: "OWNER",
        },
        select: {
          userId: true,
        },
      });
      if (!teamOwner || teamOwner.userId !== req.session.user.id) {
        return res.status(401).json({ message: "You must be team owner to do this" });
      }
    }
    const alreadyInstalled = await prisma.credential.findFirst({
      where: {
        type: appType,
        userId: req.session.user.id,
      },
    });
    if (alreadyInstalled) {
      return res.status(200).json({ url: "/apps/installed/payment" });
    }

    const params = {
      client_id: RAZORPAY_CLIENT_ID as string,
      response_type: "code",
      redirect_uri: RAZORPAY_REDIRECT_URL as string,
      scope: "read_write",
      state: RAZORPAY_STATE_KEY as string,
    };

    const queryString = new URLSearchParams(params).toString();
    const url = `https://auth.razorpay.com/authorize?${queryString}`;

    return res.status(200).json({ url });
  } catch (error: unknown) {
    console.error("getRazorpayOnboardingUrl", error);
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(500);
  }
}
