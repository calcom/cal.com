import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/client";
import prisma from "../../../../lib/prisma";
import { encrypt } from "../../../../lib/crypto";

export default async function handler(req: NextApiRequest, res: NextApiResponse): void {
  if (req.method === "GET") {
    const session = await getSession({ req: req });

    if (!session) {
      res.status(401).json({ message: "You must be logged in to do this" });
      return;
    }

    // const hostname = 'x-forwarded-host' in req.headers ? 'https://' + req.headers['x-forwarded-host'] : 'host' in req.headers ? (req.secure ? 'https://' : 'http://') + req.headers['host'] : '';

    // if ( ! hostname || ! req.headers.referer.startsWith(hostname)) {
    //     throw new Error('Unable to determine external url, check server settings');
    // }

    // function generateAuthUrl() {
    //     return 'https://oauth.yandex.ru/authorize?response_type=code&scope=' + SCOPES.join(' ') + '&client_id=' + process.env.YANDEX_OAUTH_ID + '&redirect_uri=' + hostname + '/api/integrations/yandexcalendar/callback';
    // }

    // res.status(200).json({url: generateAuthUrl() });

    await prisma.credential.create({
      data: {
        type: "yandex_calendar",
        key: {},
        userId: session.user.id,
      },
    });

    res.status(200).json({ url: "/integrations" });
  }

  if (req.method === "POST") {
    const session = await getSession({ req: req });

    if (!session) {
      res.status(401).json({ message: "You must be logged in to do this" });
      return;
    }

    const { user, password } = req.body;

    if (!user || !password) {
      return res.status(400).json({ message: "Wrong credentials" });
    }

    await prisma.credential.create({
      data: {
        type: "yandex_calendar",
        key: {
          user,
          hash: encrypt(password, process.env.CRYPTO_PRIVATE_KEY),
        },
        userId: session.user.id,
      },
    });

    res.status(200).json({ url: "/integrations" });
  }
}
