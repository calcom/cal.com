import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

const SUPABASE_URL = "https://ogbfbwkftgpdiejqafdq.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

async function getHandler(req: NextApiRequest) {
  const { scope, params } = req.query;
  let formattedParams = "";

  if (!scope) return { message: "No scope provided" };

  if (params) {
    const unparsedParams = JSON.parse(params as string);
    formattedParams = `?${Object.entries(unparsedParams)
      .map(([key, value]) => `${key}=${value}`)
      .join("&")}`;
  }

  const supabaseResponse = await fetch(`${SUPABASE_URL}${scope}${formattedParams}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
    },
  });

  const data = await supabaseResponse.json();

  return { data };
}

export default defaultResponder(getHandler);
