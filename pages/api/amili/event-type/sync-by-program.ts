import prisma from "@lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";

import runMiddleware, { checkAmiliAuth } from "../../../../lib/amili/middleware";

type Product = {
  id: string;
  name: string;
  description: string;
};

type ReqPayload = {
  coachProgramId: string;
  data: {
    duration?: number;
    product: Product;
  };
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { body, method } = req;
  if (method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { coachProgramId, data } = body as ReqPayload;

  await runMiddleware(req, res, checkAmiliAuth);

  const keyMapping = {
    name: "title",
    duration: "length",
    description: "description",
  };

  const updatedData = Object.keys(data).reduce((ac, key) => {
    if (key === "product") {
      const { name, description } = data[key];

      return { ...ac, [keyMapping["name"]]: name, [keyMapping["description"]]: description };
    } else {
      return { ...ac, [keyMapping[key]]: data[key] };
    }
  }, {});

  await prisma.eventType.updateMany({
    where: {
      coachProgramId,
    },
    data: updatedData,
  });

  res.status(200).json({ message: "Sync coach program successful" });
};

export default handler;
