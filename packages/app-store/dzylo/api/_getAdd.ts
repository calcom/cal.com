import type { NextApiRequest, NextApiResponse } from "next";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { stringify } from "querystring";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    let clientId = "";
    const appKeys = await getAppKeysFromSlug("dzylo");
    if (typeof appKeys.client_id === "string") clientId = appKeys.client_id;
    if (!clientId) return res.status(400).json({ message: "dzylo client id missing." });
    const state = encodeOAuthState(req);

    const params = {
        client_id: clientId,
        redirect_uri: `${WEBAPP_URL}/api/integrations/dzylo/callback`,
        state
      };
    
    const query = stringify(params);
    const url = `https://one.dzylo.com/cal-integration?${query}`;
    res.status(200).json({ url });
}
