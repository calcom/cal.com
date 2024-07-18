import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { getOrgUsernameFromEmail } from "@calcom/features/auth/signup/utils/getOrgUsernameFromEmail";
import { checkPremiumUsername } from "@calcom/features/ee/common/lib/checkPremiumUsername";
import { isSAMLLoginEnabled } from "@calcom/features/ee/sso/lib/saml";
import { getFeatureFlag } from "@calcom/features/flags/server/utils";
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
  const emailVerificationEnabled = await getFeatureFlag(prisma, "email-verification");
  await ssrInit(ctx);
  const signupDisabled = await getFeatureFlag(prisma, "disable-signup");

  const token = z.string().optional().parse(ctx.query.token);
  const redirectUrlData = z
    .string()
    .refine((value) => value.startsWith(WEBAPP_URL), {
      params: (value: string) => ({ value }),
      message: "Redirect URL must start with 'cal.com'",
    })
    .optional()
    .safeParse(ctx.query.redirect);

  const redirectUrl = redirectUrlData.success && redirectUrlData.data ? redirectUrlData.data : null;

  const props = {
    redirectUrl,
    isGoogleLoginEnabled: IS_GOOGLE_LOGIN_ENABLED,
    isSAMLLoginEnabled,
    prepopulateFormValues: undefined,
    emailVerificationEnabled,
  };

  // username + email prepopulated from query params
  const { username: preFillusername, email: prefilEmail } = querySchema.parse(ctx.query);

  if ((process.env.NEXT_PUBLIC_DISABLE_SIGNUP === "true" && !token) || signupDisabled) {
    return {
      redirect: {
        permanent: false,
        destination: `/auth/error?error=Signup is disabled in this instance`,
      },
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
          isOrganization: true,
          parentId: true,
          parent: {
            select: {
              slug: true,
              isOrganization: true,
              organizationSettings: true,
            },
          },
          slug: true,
          organizationSettings: true,
        },
      },
    },
  });

  if (!verificationToken || verificationToken.expires < new Date()) {
    return {
      redirect: {
        permanent: false,
        destination: `/auth/error?error=Verification Token is missing or has expired`,
      },
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
  // Detect if the team is an org by either the metadata flag or if it has a parent team
  const isOrganization = tokenTeam.isOrganization;
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
  const parentOrgSettings = tokenTeam?.parent?.organizationSettings ?? null;

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
                    ? tokenTeam.organizationSettings?.orgAutoAcceptEmail
                    : parentOrgSettings?.orgAutoAcceptEmail) || ""
                )
              : slugify(username),
          }
        : null,
      orgSlug,
      orgAutoAcceptEmail: isOrgInviteByLink
        ? tokenTeam?.organizationSettings?.orgAutoAcceptEmail ?? parentOrgSettings?.orgAutoAcceptEmail ?? null
        : null,
    },
  };
};
