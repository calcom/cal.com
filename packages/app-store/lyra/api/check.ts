import process from "node:process";
import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import type { NextApiRequest } from "next";
import checkSession from "../../_utils/auth";

const LYRA_API_URL = process.env.LYRA_API_URL || "https://app.lyra.so";

export async function getHandler(req: NextApiRequest) {
  const { api_key } = req.body;
  if (!api_key) throw new HttpError({ statusCode: 400, message: "No API key provided to check" });

  checkSession(req);

  try {
    const response = await fetch(`${LYRA_API_URL}/api/v1/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${api_key}`,
      },
    });

    const data = await response.json();

    if (response.ok && data.valid) {
      return {};
    } else {
      throw new HttpError({ statusCode: 401, message: data.error || "Invalid API key" });
    }
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError({ statusCode: 500, message: "Failed to verify API key" });
  }
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(getHandler) }),
});
