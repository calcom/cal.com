import { LOGO } from "@calcom/lib/constants";
import { publicProcedure, router } from "@calcom/trpc/server/trpc";

const DEFAULT_LOGO = {
  logo: LOGO,
  isSubdomain: false,
  subdomain: "",
};

export const orgsRouter = router({
  getLogo: publicProcedure.query(async ({ ctx }) => {
    const hostname = ctx?.req?.headers["host"];
    if (!hostname) return DEFAULT_LOGO;
    console.log("hostname", hostname);
    const hostnameParts = hostname.split(".");
    let appSubdomain;
    if (hostnameParts.length >= 3) {
      const subdomain = hostnameParts.slice(0, -2).join(".");
      let domain = hostnameParts.slice(-2).join(".");
      // Remove port from domain if it exists (e.g. cal.com:3000) -> cal.com
      const domainParts = domain.split(":");
      if (domainParts.length > 1) {
        domain = domainParts[0];
      }
      if (domain === "cal.com" || domain === "cal.dev") {
        if (subdomain !== "app" && subdomain !== "console") {
          appSubdomain = subdomain;
        }
      }
    }
    if (!appSubdomain) return DEFAULT_LOGO;

    const team = await ctx.prisma.team.findUnique({
      where: {
        slug: appSubdomain,
      },
      select: {
        appLogo: true,
      },
    });

    if (!team) return DEFAULT_LOGO;

    return {
      logo: team?.appLogo || LOGO,
      subdomain: appSubdomain,
      isSubdomain: !!appSubdomain,
    };
  }),
});
