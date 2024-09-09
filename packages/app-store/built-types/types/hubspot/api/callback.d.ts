import type { TokenResponseIF } from "@hubspot/api-client/lib/codegen/oauth/models/TokenResponseIF";
import type { NextApiRequest, NextApiResponse } from "next";
export interface HubspotToken extends TokenResponseIF {
    expiryDate?: number;
}
export default function handler(req: NextApiRequest, res: NextApiResponse): Promise<void>;
//# sourceMappingURL=callback.d.ts.map