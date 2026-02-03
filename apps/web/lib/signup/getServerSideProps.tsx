import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { checkPremiumUsername } from "@calcom/features/ee/common/lib/checkPremiumUsername";
import { isSAMLLoginEnabled } from "@calcom/features/ee/sso/lib/saml";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { IS_SELF_HOSTED, WEBAPP_URL } from "@calcom/lib/constants";
import { emailSchema } from "@calcom/lib/emailSchema";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import slugify from "@calcom/lib/slugify";

import { IS_GOOGLE_LOGIN_ENABLED } from "@server/lib/constants";

const checkValidEmail = (email: string) => emailSchema.safeParse(email).success;

const querySchema = z.object({
  username: z
    .string()
    .optional()
    .transform((val) => val || ""),
  email: emailSchema.optional(),
});

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  //redirecting the already signed up user to / page
  const session = await getServerSession({ req: ctx.req });

  if (session) {
    const { callbackUrl } = ctx.query;
    if (callbackUrl) {
      try {
        const destination = getSafeRedirectUrl(callbackUrl as string);
        if (destination) {
          return {
            redirect: {
              destination,
              permanent: false,
            },
          };
        }
      } catch (e) {
        console.warn(e);
      }
    }
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const featuresRepository = new FeaturesRepository();
  const emailVerificationEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally(
    "email-verification"
  );
  const signupDisabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("disable-signup");

  const token = z.string().optional().parse(ctx.query.token);
  const redirectUrlData = z.string().optional().safeParse(ctx.query.redirect);

  const redirectUrl = redirectUrlData.success && redirectUrlData.data ? redirectUrlData.data : null;

  const props = {
    redirectUrl,
    isGoogleLoginEnabled: IS_GOOGLE_LOGIN_ENABLED,
    isSAMLLoginEnabled,
    prepopulateFormValues: undefined,
    emailVerificationEnabled,
  };

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
    // username + email prepopulated from query params
    const queryData = querySchema.safeParse(ctx.query);
    return {
      props: JSON.parse(
        JSON.stringify({
          ...props,
          prepopulateFormValues: {
            username: queryData.success ? queryData.data.username : null,
            email: queryData.success ? queryData.data.email : null,
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
      calIdTeam: {
        select: {
          metadata: true,
          slug: true,
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
  verificationToken.identifier = getEmailFromTokenIdentifier(verificationToken.identifier);

  let username = guessUsernameFromEmail(verificationToken.identifier);

  if (!IS_SELF_HOSTED) {
    const { available, suggestion } = await checkPremiumUsername(username);
    username = available ? username : suggestion || username;
  }

  return {
    props: {
      ...props,
      token,
      prepopulateFormValues: {
        email: verificationToken.identifier,
        username: slugify(username),
      },
    },
  };
};

const getEmailFromTokenIdentifier = (input: string): string => {
  const lastDashIndex = input.lastIndexOf("-");
  if (lastDashIndex === -1) {
    return input; // no dash found, return whole string
  }
  return input.slice(lastDashIndex + 1);
};
