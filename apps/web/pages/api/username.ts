import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { checkUsername } from "@calcom/lib/server/checkUsername";

type Response = {
  available: boolean;
  premium: boolean;
};

const bodySchema = z.object({
  username: z.string(),
  orgSlug: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse<Response>): Promise<void> {
  const { currentOrgDomain } = orgDomainConfig(req);
  const { username, orgSlug } = bodySchema.parse(req.body);
  const result = await checkUsername(username, currentOrgDomain || orgSlug);
  return res.status(200).json(result);
}
