import type { NextApiRequest, NextApiResponse } from "next/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { place } = req.query;

  try {
    const params = new URLSearchParams({
      input: place as string,
      key: process.env.GOOGLE_PLACES_API_KEY as string,
    });

    // Calling Google Places API to get the autocomplete predictions
    const rawPlacesData = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`
    );

    const data = await rawPlacesData.json();

    const predictions = data.predictions.map((prediction: { description: string }) => {
      return prediction.description;
    });

    res.status(200).json(predictions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
}
