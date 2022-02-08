import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).end();
  }

  const { employerId } = req.query;

  if (!employerId) {
    return res.status(400).json({ message: "Couldn't find an account for this email" });
  }

  res.status(200).json({
    email: `khibra_employer_${employerId}@getkhibra.com`,
    password: process.env.KHIBRA_EMPLOYER_PASSWORD || "123456",
  });
}
