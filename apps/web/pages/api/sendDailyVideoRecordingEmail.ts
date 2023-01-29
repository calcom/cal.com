// shift to ee
import client from "@sendgrid/client";
import sgMail from "@sendgrid/mail";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { defaultHandler } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

const sendgridAPIKey = process.env.SENDGRID_API_KEY as string;
const senderEmail = process.env.SENDGRID_EMAIL as string;

sgMail.setApiKey(sendgridAPIKey);

const schema = z.object({
  uid: z.string(),
  downloadLink: z.string(),
  duration: z.number(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_EMAIL) {
    res.status(405).json({ message: "No SendGrid API key or email" });
    return;
  }

  const response = schema.safeParse(req.body);

  if (!response.success) {
    return res.status(400).send({
      message: "Invalid Payload",
    });
  }

  const { uid, duration, downloadLink } = response.data;

  console.log("Req_S", req.body);
  //   console.log("TESATSE", req);

  try {
    const booking = await prisma.booking.findFirst({
      where: {
        uid,
      },
      select: {
        id: true,
        location: true,
      },
    });

    if (!booking || booking.location !== "integrations:daily") {
      return res.status(404).send({
        message: `Booking of ${uid} does not exist or does not contain daily video as location`,
      });
    }

    await prisma.booking.update({
      where: {
        uid,
      },
      data: {
        isRecordingExist: true,
      },
    });

    // Schedule email here

    return res.status(200).json({ message: "Success" });
  } catch (err) {
    console.log("EREF", err);
    return res.status(500).json({ message: "something went wrong" });
  }
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
