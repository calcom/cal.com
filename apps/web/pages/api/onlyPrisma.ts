import type { NextApiRequest, NextApiResponse } from "next";

/**
 * This API endpoint is used to serve the logo associated with a team if no logo is found we serve our default logo
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { default: prisma } = await import("@calcom/prisma");
  try {
    console.log(prisma);
  } catch (error) {}

  res.statusCode = 200;
  res.json({ message: "All good" });
}
