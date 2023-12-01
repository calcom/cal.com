import type { NextApiRequest, NextApiResponse } from "next";

import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { checkUsername } from "@calcom/lib/server/checkUsername";

type Response = {
  available: boolean;
  premium: boolean;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Response>): Promise<void> {
  const { currentOrgDomain } = orgDomainConfig(req);
  const result = await checkUsername(req.body.username, currentOrgDomain);
  return res.status(200).json(result);
}
