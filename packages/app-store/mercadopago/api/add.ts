import type { NextApiRequest, NextApiResponse } from "next";

import MercadoPago from "@calcom/app-store/mercadopago/lib/MercadoPago";
import { getMercadoPagoAppKeys } from "@calcom/app-store/mercadopago/lib/getMercadoPagoAppKeys";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  if (req.method === "GET") {
    const { client_id, client_secret } = await getMercadoPagoAppKeys();

    const mercadoPagoClient = new MercadoPago({ clientId: client_id, clientSecret: client_secret });

    const url = mercadoPagoClient.getOAuthUrl(String(req.session.user.id));

    res.status(200).json({ url });
  }
}
