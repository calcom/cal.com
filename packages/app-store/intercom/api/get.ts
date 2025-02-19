import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Retrieve URL from query parameters
    const url = req.query.url as string;

    if (!url) return res.status(400).json({ message: "Missing URL in query parameters" });

    // Generate HTML with embedded booking component
    const htmlResponse = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Cal.com iframe</title>
      </head>
      <body>
        <iframe id="my-cal-inline" src="${url}" title="Cal.com booking form" frameborder="0"></iframe>
      </body>
      </html>
    `;

    res.status(200).send(htmlResponse);
  } else {
    res.status(405).end(); // Method Not Allowed
  }
}