import { z } from "zod";

import { LOGO, WEBSITE_URL } from "@calcom/lib/constants";
import { publicProcedure, router } from "@calcom/trpc/server/trpc";

const domainMapSchema = z.object({
  logo: z.string(),
  name: z.string(),
});

export const orgsRouter = router({
  // Process.env is only use as we need this before ORGS are fully implemented and we cant have names stored in code.
  getLogo: publicProcedure.input(z.object({ subdomain: z.string().nullable() })).query(async ({ input }) => {
    const { subdomain } = input;
    if (!subdomain) return LOGO;

    // eslint-disable-next-line turbo/no-undeclared-env-vars
    const ORGS = process.env.DOMAIN_LOGO_MAP ?? "{}";

    if (ORGS) {
      const orgs = JSON.parse(ORGS);
      const foundOrg = Object.entries(orgs).find(([key, value]) => key === subdomain);

      if (!foundOrg) return LOGO;
      const [_, entry] = foundOrg;
      const parsedDomainMap = domainMapSchema.safeParse(entry);
      return parsedDomainMap.success ? `${WEBSITE_URL}/logos/${parsedDomainMap.data.logo}` : LOGO;
    }
    return LOGO;
  }),
});
