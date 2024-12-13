import { cardExamples } from "@pages/api/plain/example-cards";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Disabled vercel's edge cache
    res.setHeader("Cache-Control", "no-cache");

    const { cardKeys, customer } = req.body;
    const { email, id, username, timeZone, name } = customer;

    if (!email || !id) {
      return res.status(400).json({ error: "Invalid customer data" });
    }

    // Fetch the card data using the cardExamples function
    const cards = await Promise.all(
      cardExamples.map(async (cardFn) => {
        return cardFn(email, id, username, timeZone, name);
      })
    );

    const filteredCards = cards.filter((card) => {
      return cardKeys.length === 0 || cardKeys.includes(card.key);
    });

    res.status(200).json({
      cards: filteredCards,
    });
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
