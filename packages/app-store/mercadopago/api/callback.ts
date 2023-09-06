import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import appConfig from "../config.json";
import MercadoPago from "../lib/MercadoPago";
import { getMercadoPagoAppKeys } from "../lib/getMercadoPagoAppKeys";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state } = req.query;

  if (!code || typeof code !== "string") {
    return res.status(400).json({ message: "`code` must be a string" });
  }

  if (!state || typeof state !== "string") {
    return res.status(400).json({ message: "`state` must be a string" });
  }

  if (!req.session?.user?.id || req.session.user.id !== Number(state)) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const { client_id, client_secret } = await getMercadoPagoAppKeys();

  const mercadoPagoClient = new MercadoPago({ clientId: client_id, clientSecret: client_secret });

  const oAuthToken = await mercadoPagoClient.getOAuthToken({ code });

  await prisma.credential.create({
    data: {
      type: appConfig.type,
      key: oAuthToken,
      userId: req.session.user.id,
      appId: appConfig.slug,
    },
  });

  res.redirect(getInstalledAppPath({ variant: appConfig.variant, slug: appConfig.slug }));
}
