import type { NextRequest } from "next/server";

export const config = {
  runtime: "experimental-edge",
};

export default async function handler(req: NextRequest) {
  const countryCode = req.headers.get("x-vercel-ip-country") ?? "";
  return new Response(
    JSON.stringify({
      countryCode,
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    }
  );
}
