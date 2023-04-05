import sgMail from "@sendgrid/mail";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { defaultHandler } from "@calcom/lib/server";

const sendgridAPIKey = process.env.SENDGRID_API_KEY as string;
const senderEmail = process.env.SENDGRID_EMAIL as string;

sgMail.setApiKey(sendgridAPIKey);

const requestQuerySchema = z.object({
  sendTo: z.string(),
  fullName: z.string().nullable(),
  videoUrl: z.string(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("REQ", req.body);
  const reqBody = requestQuerySchema.safeParse(req.body);

  if (!reqBody.success) {
    return res.status(400).json({ error: reqBody.error });
  }

  const { sendTo, fullName, videoUrl } = reqBody.data;
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_EMAIL) {
    res.status(405).json({ message: "No SendGrid API key or email" });
    return;
  }

  // User a template here
  try {
    await sgMail.send({
      to: sendTo,
      from: {
        email: senderEmail,
      },
      subject: "Check this out",
      text: `Hey ${fullName} Check this video ${videoUrl}`,
    });
  } catch (err) {
    console.log("err", err);
  }
  res.status(200).json({ message: "Emails scheduled" });
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
