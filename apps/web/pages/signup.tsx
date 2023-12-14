import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarHeart, Info, Link2, ShieldCheckIcon, StarIcon, Users } from "lucide-react";
import type { GetServerSidePropsContext } from "next";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm, useFormContext } from "react-hook-form";
import { Toaster } from "react-hot-toast";
import { z } from "zod";

import getStripe from "@calcom/app-store/stripepayment/lib/client";
import { getPremiumPlanPriceValue } from "@calcom/app-store/stripepayment/lib/utils";
import { getOrgUsernameFromEmail } from "@calcom/features/auth/signup/utils/getOrgUsernameFromEmail";
import { checkPremiumUsername } from "@calcom/features/ee/common/lib/checkPremiumUsername";
import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { isSAMLLoginEnabled } from "@calcom/features/ee/sso/lib/saml";
import { useFlagMap } from "@calcom/features/flags/context/provider";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import { classNames } from "@calcom/lib";
import { APP_NAME, IS_CALCOM, IS_SELF_HOSTED, WEBAPP_URL, WEBSITE_URL } from "@calcom/lib/constants";
import { fetchUsername } from "@calcom/lib/fetchUsername";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import { signupSchema as apiSignupSchema } from "@calcom/prisma/zod-utils";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Button, HeadSeo, PasswordField, TextField, Form, Alert, showToast } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

import { IS_GOOGLE_LOGIN_ENABLED } from "../server/lib/constants";
import { ssrInit } from "../server/lib/ssr";

const signupSchema = apiSignupSchema.extend({
  apiError: z.string().optional(), // Needed to display API errors doesnt get passed to the API
});

type FormValues = z.infer<typeof signupSchema>;

type SignupProps = inferSSRProps<typeof getServerSideProps>;

const FEATURES = [
  {
    title: "connect_all_calendars",
    description: "connect_all_calendars_description",
    i18nOptions: {
      appName: APP_NAME,
    },
    icon: CalendarHeart,
  },
  {
    title: "set_availability",
    description: "set_availbility_description",
    icon: Users,
  },
  {
    title: "share_a_link_or_embed",
    description: "share_a_link_or_embed_description",
    icon: Link2,
    i18nOptions: {
      appName: APP_NAME,
    },
  },
];

function UsernameField({
  username,
  setPremium,
  premium,
  setUsernameTaken,
  usernameTaken,
  ...props
}: React.ComponentProps<typeof TextField> & {
  username: string;
  setPremium: (value: boolean) => void;
  premium: boolean;
  usernameTaken: boolean;
  setUsernameTaken: (value: boolean) => void;
}) {
  const { t } = useLocale();
  const { register, formState } = useFormContext<FormValues>();
  const debouncedUsername = useDebounce(username, 600);

  useEffect(() => {
    if (formState.isSubmitting || formState.isSubmitSuccessful) return;

    async function checkUsername() {
      if (!debouncedUsername) {
        setPremium(false);
        setUsernameTaken(false);
        return;
      }
      fetchUsername(debouncedUsername).then(({ data }) => {
        setPremium(data.premium);
        setUsernameTaken(!data.available);
      });
    }
    checkUsername();
  }, [debouncedUsername, setPremium, setUsernameTaken, formState.isSubmitting, formState.isSubmitSuccessful]);

  return (
    <div>
      <TextField
        {...props}
        {...register("username")}
        data-testid="signup-usernamefield"
        addOnFilled={false}
      />
      {(!formState.isSubmitting || !formState.isSubmitted) && (
        <div className="text-gray text-default flex items-center text-sm">
          <div className="text-sm ">
            {usernameTaken ? (
              <div className="text-error flex items-center">
                <Info className="mr-1 inline-block h-4 w-4" />
                <p>{t("already_in_use_error")}</p>
              </div>
            ) : premium ? (
              <div data-testid="premium-username-warning" className="flex items-center">
                <StarIcon className="mr-1 inline-block h-4 w-4" />
                <p>
                  {t("premium_username", {
                    price: getPremiumPlanPriceValue(),
                  })}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

const checkValidEmail = (email: string) => z.string().email().safeParse(email).success;

function addOrUpdateQueryParam(url: string, key: string, value: string) {
  const separator = url.includes("?") ? "&" : "?";
  const param = `${key}=${encodeURIComponent(value)}`;
  return `${url}${separator}${param}`;
}

export default function Signup({
  prepopulateFormValues,
  token,
  orgSlug,
  isGoogleLoginEnabled,
  isSAMLLoginEnabled,
  orgAutoAcceptEmail,
}: SignupProps) {
  const [premiumUsername, setPremiumUsername] = useState(false);
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const searchParams = useCompatSearchParams();
  const telemetry = useTelemetry();
  const { t, i18n } = useLocale();
  const router = useRouter();
  const flags = useFlagMap();
  const formMethods = useForm<FormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: prepopulateFormValues satisfies FormValues,
    mode: "onChange",
  });
  const {
    register,
    watch,
    formState: { isSubmitting, errors, isSubmitSuccessful },
  } = formMethods;

  const loadingSubmitState = isSubmitSuccessful || isSubmitting;

  const handleErrorsAndStripe = async (resp: Response) => {
    if (!resp.ok) {
      const err = await resp.json();
      if (err.checkoutSessionId) {
        const stripe = await getStripe();
        if (stripe) {
          console.log("Redirecting to stripe checkout");
          const { error } = await stripe.redirectToCheckout({
            sessionId: err.checkoutSessionId,
          });
          console.warn(error.message);
        }
      } else {
        throw new Error(err.message);
      }
    }
  };

  const isOrgInviteByLink = orgSlug && !prepopulateFormValues?.username;

  const signUp: SubmitHandler<FormValues> = async (data) => {
    await fetch("/api/auth/signup", {
      body: JSON.stringify({
        ...data,
        language: i18n.language,
        token,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    })
      .then(handleErrorsAndStripe)
      .then(async () => {
        telemetry.event(telemetryEventTypes.signup, collectPageParameters());
        const verifyOrGettingStarted = flags["email-verification"] ? "auth/verify-email" : "getting-started";
        const callBackUrl = `${
          searchParams?.get("callbackUrl")
            ? isOrgInviteByLink
              ? `${WEBAPP_URL}/${searchParams.get("callbackUrl")}`
              : addOrUpdateQueryParam(`${WEBAPP_URL}/${searchParams.get("callbackUrl")}`, "from", "signup")
            : `${WEBAPP_URL}/${verifyOrGettingStarted}?from=signup`
        }`;

        await signIn<"credentials">("credentials", {
          ...data,
          callbackUrl: callBackUrl,
        });
      })
      .catch((err) => {
        formMethods.setError("apiError", { message: err.message });
      });
  };

  return (
    <div className="light bg-muted 2xl:bg-default flex min-h-screen w-full flex-col items-center justify-center [--cal-brand-emphasis:#101010] [--cal-brand:#111827] [--cal-brand-text:#FFFFFF] [--cal-brand-subtle:#9CA3AF] dark:[--cal-brand-emphasis:#e1e1e1] dark:[--cal-brand:white] dark:[--cal-brand-text:#000000]">
      <div className="bg-muted 2xl:border-subtle grid w-full max-w-[1440px] grid-cols-1 grid-rows-1 overflow-hidden lg:grid-cols-2 2xl:rounded-[20px] 2xl:border 2xl:py-6">
        <HeadSeo title={t("sign_up")} description={t("sign_up")} />
        {/* Left side */}
        <div className="flex w-full flex-col px-4 pt-6 sm:px-16 md:px-20 2xl:px-28">
          {/* Header */}
          {errors.apiError && (
            <Alert severity="error" message={errors.apiError?.message} data-testid="signup-error-message" />
          )}
          <div className="flex flex-col gap-2">
            <h1 className="font-cal text-[28px] leading-none ">
              {IS_CALCOM ? t("create_your_calcom_account") : t("create_your_account")}
            </h1>
            {IS_CALCOM ? (
              <p className="text-subtle text-base font-medium leading-5">{t("cal_signup_description")}</p>
            ) : (
              <p className="text-subtle text-base font-medium leading-5">
                {t("calcom_explained", {
                  appName: APP_NAME,
                })}
              </p>
            )}
          </div>
          {/* Form Container */}
          <div className="mt-10">
            <Form
              className="flex flex-col gap-4"
              form={formMethods}
              handleSubmit={async (values) => {
                let updatedValues = values;
                if (!formMethods.getValues().username && isOrgInviteByLink && orgAutoAcceptEmail) {
                  updatedValues = {
                    ...values,
                    username: getOrgUsernameFromEmail(values.email, orgAutoAcceptEmail),
                  };
                }
                await signUp(updatedValues);
              }}>
              {/* Username */}
              {!isOrgInviteByLink ? (
                <UsernameField
                  label={t("username")}
                  username={watch("username") || ""}
                  premium={premiumUsername}
                  usernameTaken={usernameTaken}
                  disabled={!!orgSlug}
                  setUsernameTaken={(value) => setUsernameTaken(value)}
                  data-testid="signup-usernamefield"
                  setPremium={(value) => setPremiumUsername(value)}
                  addOnLeading={
                    orgSlug
                      ? `${getOrgFullOrigin(orgSlug, { protocol: true })}/`
                      : `${process.env.NEXT_PUBLIC_WEBSITE_URL}/`
                  }
                />
              ) : null}
              {/* Email */}
              <TextField
                {...register("email")}
                label={t("email")}
                type="email"
                disabled={prepopulateFormValues?.email}
                data-testid="signup-emailfield"
              />

              {/* Password */}
              <PasswordField
                data-testid="signup-passwordfield"
                label={t("password")}
                {...register("password")}
                hintErrors={["caplow", "min", "num"]}
              />
              <Button
                type="submit"
                className="my-2 w-full justify-center"
                loading={loadingSubmitState}
                disabled={
                  !!formMethods.formState.errors.username ||
                  !!formMethods.formState.errors.email ||
                  !formMethods.getValues("email") ||
                  !formMethods.getValues("password") ||
                  isSubmitting ||
                  usernameTaken
                }>
                {premiumUsername && !usernameTaken
                  ? `Create Account for ${getPremiumPlanPriceValue()}`
                  : t("create_account")}
              </Button>
            </Form>
            {/* Continue with Social Logins - Only for non-invite links */}
            {token || (!isGoogleLoginEnabled && !isSAMLLoginEnabled) ? null : (
              <div className="mt-6">
                <div className="relative flex items-center">
                  <div className="border-subtle flex-grow border-t" />
                  <span className="text-subtle leadning-none mx-2 flex-shrink text-sm font-normal ">
                    {t("or_continue_with")}
                  </span>
                  <div className="border-subtle flex-grow border-t" />
                </div>
              </div>
            )}
            {/* Social Logins - Only for non-invite links*/}
            {!token && (
              <div className="mt-6 flex flex-col gap-2 md:flex-row">
                {isGoogleLoginEnabled ? (
                  <Button
                    color="secondary"
                    disabled={!!formMethods.formState.errors.username || premiumUsername}
                    loading={isGoogleLoading}
                    StartIcon={() => (
                      <>
                        <img
                          className={classNames(
                            "text-subtle  mr-2 h-4 w-4 dark:invert",
                            premiumUsername && "opacity-50"
                          )}
                          src="/google-icon.svg"
                          alt=""
                        />
                      </>
                    )}
                    className={classNames(
                      "w-full justify-center rounded-md text-center",
                      formMethods.formState.errors.username ? "opacity-50" : ""
                    )}
                    onClick={async () => {
                      setIsGoogleLoading(true);
                      const username = formMethods.getValues("username");
                      const baseUrl = process.env.NEXT_PUBLIC_WEBAPP_URL;
                      const GOOGLE_AUTH_URL = `${baseUrl}/auth/sso/google`;
                      if (username) {
                        // If username is present we save it in query params to check for premium
                        const searchQueryParams = new URLSearchParams();
                        searchQueryParams.set("username", username);
                        localStorage.setItem("username", username);
                        router.push(`${GOOGLE_AUTH_URL}?${searchQueryParams.toString()}`);
                        return;
                      }
                      router.push(GOOGLE_AUTH_URL);
                    }}>
                    Google
                  </Button>
                ) : null}
                {isSAMLLoginEnabled ? (
                  <Button
                    color="secondary"
                    disabled={
                      !!formMethods.formState.errors.username ||
                      !!formMethods.formState.errors.email ||
                      premiumUsername ||
                      isSubmitting ||
                      isGoogleLoading
                    }
                    className={classNames(
                      "w-full justify-center rounded-md text-center",
                      formMethods.formState.errors.username && formMethods.formState.errors.email
                        ? "opacity-50"
                        : ""
                    )}
                    onClick={() => {
                      if (!formMethods.getValues("username")) {
                        formMethods.trigger("username");
                      }
                      if (!formMethods.getValues("email")) {
                        formMethods.trigger("email");

                        return;
                      }
                      const username = formMethods.getValues("username");
                      if (!username) {
                        showToast("error", t("username_required"));
                        return;
                      }
                      localStorage.setItem("username", username);
                      const sp = new URLSearchParams();
                      // @NOTE: don't remove username query param as it's required right now for stripe payment page
                      sp.set("username", username);
                      sp.set("email", formMethods.getValues("email"));
                      router.push(
                        `${process.env.NEXT_PUBLIC_WEBAPP_URL}/auth/sso/saml` + `?${sp.toString()}`
                      );
                    }}>
                    <ShieldCheckIcon className="mr-2 h-5 w-5" />
                    {t("saml_sso")}
                  </Button>
                ) : null}
              </div>
            )}
          </div>
          {/* Already have an account & T&C */}
          <div className="mt-10 flex h-full flex-col justify-end text-xs">
            <div className="flex flex-col text-sm">
              <div className="flex gap-1">
                <p className="text-subtle">{t("already_have_account")}</p>
                <Link href="/auth/login" className="text-emphasis hover:underline">
                  {t("sign_in")}
                </Link>
              </div>
              <div className="text-subtle">
                By signing up, you agree to our{" "}
                <Link className="text-emphasis hover:underline" href={`${WEBSITE_URL}/terms`}>
                  Terms{" "}
                </Link>
                <span>&</span>{" "}
                <Link className="text-emphasis hover:underline" href={`${WEBSITE_URL}/privacy`}>
                  Privacy Policy.
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div
          className="border-subtle hidden w-full flex-col justify-between rounded-l-2xl border py-12 pl-12 lg:flex"
          style={{
            background:
              "radial-gradient(162.05% 170% at 109.58% 35%, rgba(102, 117, 147, 0.7) 0%, rgba(212, 212, 213, 0.4) 100%) ",
          }}>
          {IS_CALCOM && (
            <div className="mb-12 mr-12 grid h-full w-full grid-cols-4 gap-4 ">
              <div className="">
                <img src="/product-cards/trustpilot.svg" className="h-[54px] w-full" alt="#" />
              </div>
              <div>
                <img src="/product-cards/g2.svg" className="h-[54px] w-full" alt="#" />
              </div>
              <div>
                <img src="/product-cards/producthunt.svg" className="h-[54px] w-full" alt="#" />
              </div>
            </div>
          )}
          <div
            className="border-default rounded-bl-2xl rounded-br-none rounded-tl-2xl border-dashed py-[6px] pl-[6px]"
            style={{
              backgroundColor: "rgba(236,237,239,0.9)",
            }}>
            <img src="/mock-event-type-list.svg" alt="#" className="" />
          </div>
          <div className="mr-12 mt-8 grid h-full w-full grid-cols-3 gap-4 overflow-hidden">
            {!IS_CALCOM &&
              FEATURES.map((feature) => (
                <>
                  <div className="flex flex-col leading-none">
                    <div className="text-emphasis items-center">
                      <feature.icon className="mb-1 h-4 w-4" />
                      <span className="text-sm font-medium">{t(feature.title)}</span>
                    </div>
                    <div className="text-subtle text-sm">
                      <p>
                        {t(
                          feature.description,
                          feature.i18nOptions && {
                            ...feature.i18nOptions,
                          }
                        )}
                      </p>
                    </div>
                  </div>
                </>
              ))}
          </div>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}

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
    };
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
    };
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

  // Detect if the team is an org by either the metadata flag or if it has a parent team
  const isOrganization = tokenTeam.metadata?.isOrganization || tokenTeam?.parentId !== null;
  // If we are dealing with an org, the slug may come from the team itself or its parent
  const orgSlug = isOrganization
    ? tokenTeam.metadata?.requestedSlug || tokenTeam.parent?.slug || tokenTeam.slug
    : null;

  // Org context shouldn't check if a username is premium
  if (!IS_SELF_HOSTED && !isOrganization) {
    // Im not sure we actually hit this because of next redirects signup to website repo - but just in case this is pretty cool :)
    const { available, suggestion } = await checkPremiumUsername(username);

    username = available ? username : suggestion || username;
  }

  const isValidEmail = checkValidEmail(verificationToken.identifier);
  const isOrgInviteByLink = isOrganization && !isValidEmail;
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
            username: slugify(username),
          }
        : null,
      orgSlug,
      orgAutoAcceptEmail: isOrgInviteByLink
        ? tokenTeam?.metadata?.orgAutoAcceptEmail ?? parentMetaDataForSubteam?.orgAutoAcceptEmail ?? null
        : null,
    },
  };
};

Signup.PageWrapper = PageWrapper;
