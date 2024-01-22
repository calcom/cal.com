import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { getOrgUsernameFromEmail } from "@calcom/features/auth/signup/utils/getOrgUsernameFromEmail";
import { checkPremiumUsername } from "@calcom/features/ee/common/lib/checkPremiumUsername";
import { isSAMLLoginEnabled } from "@calcom/features/ee/sso/lib/saml";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import { IS_SELF_HOSTED, WEBAPP_URL } from "@calcom/lib/constants";
import slugify from "@calcom/lib/slugify";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { IS_GOOGLE_LOGIN_ENABLED } from "@server/lib/constants";
import { ssrInit } from "@server/lib/ssr";

const checkValidEmail = (email: string) => z.string().email().safeParse(email).success;

const querySchema = z.object({
  username: z
    .string()
    .optional()
    .transform((val) => val || ""),
  email: z.string().email().optional(),
});

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const flags = await getFeatureFlagMap(prisma);
  const ssr = await ssrInit(ctx);
  const token = z.string().optional().parse(ctx.query.token);

  const props = {
    isGoogleLoginEnabled: IS_GOOGLE_LOGIN_ENABLED,
    isSAMLLoginEnabled,
    trpcState: ssr.dehydrate(),
    prepopulateFormValues: undefined,
  };

  // username + email prepopulated from query params
  const { username: preFillusername, email: prefilEmail } = querySchema.parse(ctx.query);

  if ((process.env.NEXT_PUBLIC_DISABLE_SIGNUP === "true" && !token) || flags["disable-signup"]) {
    return {
      notFound: true,
    } as const;
  }

  // no token given, treat as a normal signup without verification token
  if (!token) {
    return {
      props: JSON.parse(
        JSON.stringify({
          ...props,
          prepopulateFormValues: {
            username: preFillusername || null,
            email: prefilEmail || null,
          },
        })
      ),
    };
  }

  const verificationToken = await prisma.verificationToken.findUnique({
    where: {
      token,
    },
    include: {
      team: {
        select: {
          metadata: true,
          parentId: true,
          parent: {
            select: {
              slug: true,
              metadata: true,
            },
          },
          slug: true,
        },
      },
    },
  });

  if (!verificationToken || verificationToken.expires < new Date()) {
    return {
      notFound: true,
    } as const;
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      AND: [
        {
          email: verificationToken?.identifier,
        },
        {
          emailVerified: {
            not: null,
          },
        },
      ],
    },
  });

  if (existingUser) {
    return {
      redirect: {
        permanent: false,
        destination: `/auth/login?callbackUrl=${WEBAPP_URL}/${ctx.query.callbackUrl}`,
      },
    };
  }

  const guessUsernameFromEmail = (email: string) => {
    const [username] = email.split("@");
    return username;
  };

  let username = guessUsernameFromEmail(verificationToken.identifier);

  const tokenTeam = {
    ...verificationToken?.team,
    metadata: teamMetadataSchema.parse(verificationToken?.team?.metadata),
  };

  const isATeamInOrganization = tokenTeam?.parentId !== null;
  const isOrganization = tokenTeam.metadata?.isOrganization;
  // Detect if the team is an org by either the metadata flag or if it has a parent team
  const isOrganizationOrATeamInOrganization = isOrganization || isATeamInOrganization;
  // If we are dealing with an org, the slug may come from the team itself or its parent
  const orgSlug = isOrganizationOrATeamInOrganization
    ? tokenTeam.metadata?.requestedSlug || tokenTeam.parent?.slug || tokenTeam.slug
    : null;

  // Org context shouldn't check if a username is premium
  if (!IS_SELF_HOSTED && !isOrganizationOrATeamInOrganization) {
    // Im not sure we actually hit this because of next redirects signup to website repo - but just in case this is pretty cool :)
    const { available, suggestion } = await checkPremiumUsername(username);

    username = available ? username : suggestion || username;
  }

  const isValidEmail = checkValidEmail(verificationToken.identifier);
  const isOrgInviteByLink = isOrganizationOrATeamInOrganization && !isValidEmail;
  const parentMetaDataForSubteam = tokenTeam?.parent?.metadata
    ? teamMetadataSchema.parse(tokenTeam.parent.metadata)
    : null;

  return {
    props: {
      ...props,
      token,
      prepopulateFormValues: !isOrgInviteByLink
        ? {
            email: verificationToken.identifier,
            username: isOrganizationOrATeamInOrganization
              ? getOrgUsernameFromEmail(
                  verificationToken.identifier,
                  (isOrganization
                    ? tokenTeam.metadata?.orgAutoAcceptEmail
                    : parentMetaDataForSubteam?.orgAutoAcceptEmail) || ""
                )
              : slugify(username),
          }
        : null,
      orgSlug,
      orgAutoAcceptEmail: isOrgInviteByLink
        ? tokenTeam?.metadata?.orgAutoAcceptEmail ?? parentMetaDataForSubteam?.orgAutoAcceptEmail ?? null
        : null,
    },
  };
};
