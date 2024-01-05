import type { NextApiRequest, NextApiResponse } from "next/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { place } = req.query;

  // fallback if api key is not provided
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.warn(
      "[WARNING] GOOGLE_PLACES_API_KEY is not provided, locations autocomplete will not be available."
    );

    return res.status(500).json({ error: "API key is not provided" });
  }

  if (!place) {
    return res.status(400).json({ error: "Place is not provided" });
  }

  try {
    const params = new URLSearchParams({
      input: place as string,
      key: process.env.GOOGLE_PLACES_API_KEY,
    });

    // Calling Google Places API to get the autocomplete predictions
    const rawPlacesData = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`
    );

    const data = await rawPlacesData.json();

    const predictions = data.predictions.map((prediction: { description: string }) => {
      return prediction.description;
    });

    return res.status(200).json(predictions);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
