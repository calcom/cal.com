import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return;
  }
  const { email } = req.body;

  await fetch("https://api.sendgrid.com/v3/validations/email", {
    body: JSON.stringify({ email }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SENDGRID_VERIFICATION_KEY}`,
    },
    method: "POST",
  })
    .then((response) => response.json())
    .then((data) => {
      res.status(201).json({ verdict: data.result.verdict, suggestion: data.result.suggestion });
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}
