import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2, ShieldCheckIcon, StarIcon } from "lucide-react";
import type { GetServerSidePropsContext } from "next";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm, useFormContext } from "react-hook-form";
import { Trans } from "react-i18next";
import { z } from "zod";

import getStripe from "@calcom/app-store/stripepayment/lib/client";
import { getPremiumPlanPriceValue } from "@calcom/app-store/stripepayment/lib/utils";
import { getOrgFullDomain } from "@calcom/ee/organizations/lib/orgDomains";
import { checkPremiumUsername } from "@calcom/features/ee/common/lib/checkPremiumUsername";
import { isSAMLLoginEnabled } from "@calcom/features/ee/sso/lib/saml";
import { useFlagMap } from "@calcom/features/flags/context/provider";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import { classNames } from "@calcom/lib";
import { IS_CALCOM, IS_SELF_HOSTED, WEBAPP_URL, WEBSITE_URL } from "@calcom/lib/constants";
import { fetchUsername } from "@calcom/lib/fetchUsername";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import { signupSchema as apiSignupSchema } from "@calcom/prisma/zod-utils";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Button, HeadSeo, PasswordField, TextField, Form } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

import { IS_GOOGLE_LOGIN_ENABLED } from "../server/lib/constants";
import { ssrInit } from "../server/lib/ssr";

const signupSchema = apiSignupSchema.extend({
  apiError: z.string().optional(), // Needed to display API errors doesnt get passed to the API
});

type FormValues = z.infer<typeof signupSchema>;

type SignupProps = inferSSRProps<typeof getServerSideProps>;

function UsernameField({
  ...props
}: React.ComponentProps<typeof TextField> & { setPremiumExternal?: () => void }) {
  const { t } = useLocale();
  const { formState, watch, setError, register } = useFormContext<FormValues>();
  const { errors } = formState;
  const [loading, setLoading] = useState(false);
  const [premium, setPremium] = useState(false);
  const [taken, setTaken] = useState(false);
  const watchedUsername = watch("username");
  const debouncedUsername = useDebounce(watchedUsername, 500);

  useEffect(() => {
    async function checkUsername() {
      if (!debouncedUsername) {
        setLoading(false);
        setPremium(false);
        setTaken(false);
        return;
      }
      setLoading(true);
      fetchUsername(debouncedUsername)
        .then(({ data }) => {
          if (data.premium) {
            setPremium(true);
          } else {
            setPremium(false);
          }
          if (!data.available) {
            setTaken(true);
          }
        })
        .finally(() => {
          setLoading(false);
        });
    }
    checkUsername();
  }, [debouncedUsername, t, setError]);

  return (
    <div>
      <TextField {...props} {...register("username")} />
      <div className="text-gray text-default flex items-center text-sm">
        <p className="flex items-center text-sm ">
          {loading ? (
            <>
              <Loader2 className="mr-1 inline-block h-4 w-4 animate-spin" />
              {t("loading")}
            </>
          ) : taken ? (
            <div className="text-error">
              <Info className="mr-1 inline-block h-4 w-4" />
              {t("already_taken")}
            </div>
          ) : premium ? (
            <>
              <StarIcon className="mr-1 inline-block h-4 w-4" />
              {t("premium_username", {
                price: getPremiumPlanPriceValue(),
              })}
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}

export default function Signup({ prepopulateFormValues, token, orgSlug }: SignupProps) {
  const searchParams = useSearchParams();
  const telemetry = useTelemetry();
  const { t, i18n } = useLocale();
  const router = useRouter();
  const flags = useFlagMap();
  const formMethods = useForm<FormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: prepopulateFormValues satisfies FormValues,
  });
  const {
    register,
    formState: { errors, isSubmitting },
  } = formMethods;

  const handleErrors = async (resp: Response) => {
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
      .then(handleErrors)
      .then(async () => {
        telemetry.event(telemetryEventTypes.signup, collectPageParameters());
        const verifyOrGettingStarted = flags["email-verification"] ? "auth/verify-email" : "getting-started";
        await signIn<"credentials">("credentials", {
          ...data,
          callbackUrl: `${
            searchParams?.get("callbackUrl")
              ? `${WEBAPP_URL}/${searchParams.get("callbackUrl")}`
              : `${WEBAPP_URL}/${verifyOrGettingStarted}`
          }?from=signup`,
        });
      })
      .catch((err) => {
        formMethods.setError("apiError", { message: err.message });
      });
  };

  return (
    <>
      <div
        className="bg-muted grid min-h-screen grid-cols-1 grid-rows-1 lg:grid-cols-2 "
        style={
          {
            "--cal-brand": "#111827",
            "--cal-brand-emphasis": "#101010",
            "--cal-brand-text": "white",
            "--cal-brand-subtle": "#9CA3AF",
          } as CSSProperties
        }>
        <HeadSeo title={t("sign_up")} description={t("sign_up")} />
        <div className="flex w-full flex-col px-4 pt-16 md:px-16 lg:px-28">
          {/* Header */}
          <div className="flex flex-col gap-3 ">
            <h1 className="font-cal text-[28px] ">
              {IS_CALCOM ? t("create_your_calcom_account") : t("create_your_account")}
            </h1>
            {IS_CALCOM ? (
              <p className="text-subtle text-base font-medium leading-none">{t("cal_signup_description")}</p>
            ) : null}
          </div>
          {/* Form Container */}
          <div className="mt-10">
            <Form
              className="flex flex-col gap-5"
              form={formMethods}
              handleSubmit={async (values) => {
                await signUp(values);
              }}>
              {/* Username */}
              <UsernameField
                label={t("username")}
                addOnLeading={
                  orgSlug
                    ? getOrgFullDomain(orgSlug, { protocol: true })
                    : `${process.env.NEXT_PUBLIC_WEBSITE_URL}/`
                }
              />
              {/* Email */}
              <TextField {...register("email")} label={t("email")} type="email" />

              {/* Password */}
              <PasswordField
                label={t("password")}
                {...register("password")}
                hintErrors={["caplow", "min", "num"]}
              />
              <Button type="submit" className="w-full justify-center" loading={isSubmitting}>
                {t("create_account")}
              </Button>
            </Form>
            {/* Continue with Social Logins */}
            <div className="mt-6">
              <div className="relative flex items-center">
                <div className="border-subtle flex-grow border-t" />
                <span className="text-subtle leadning-none mx-2 flex-shrink text-sm font-normal ">
                  {t("or_continue_with")}
                </span>
                <div className="border-subtle flex-grow border-t" />
              </div>
            </div>
            {/* Social Logins */}
            <div className="mt-6 grid gap-2 lg:grid-cols-2">
              <Button
                color="secondary"
                disabled={!!formMethods.formState.errors.username}
                className={classNames(
                  "w-full justify-center rounded-md text-center",
                  formMethods.formState.errors.username ? "opacity-50" : ""
                )}
                onClick={async () => {
                  if (!formMethods.getValues("username")) {
                    formMethods.trigger("username");
                    return;
                  }
                  const username = formMethods.getValues("username");
                  const searchQueryParams = new URLSearchParams();
                  searchQueryParams.set("username", formMethods.getValues("username"));
                  const baseUrl = process.env.NEXT_PUBLIC_WEBAPP_URL;
                  localStorage.setItem("username", username);
                  // @NOTE: don't remove username query param as it's required right now for stripe payment page
                  const googleAuthUrl = `${baseUrl}/auth/sso/google?${searchQueryParams.toString()}`;

                  router.push(googleAuthUrl);
                }}>
                <img className="mr-2 h-5 w-5" src="/google-icon.svg" alt="" />
                Google
              </Button>
              <Button
                color="secondary"
                disabled={!!formMethods.formState.errors.username || !!formMethods.formState.errors.email}
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
                  localStorage.setItem("username", username);
                  const sp = new URLSearchParams();
                  // @NOTE: don't remove username query param as it's required right now for stripe payment page
                  sp.set("username", formMethods.getValues("username"));
                  sp.set("email", formMethods.getValues("email"));
                  router.push(process.env.NEXT_PUBLIC_WEBAPP_URL + "/auth/sso/saml" + "?" + sp.toString());
                }}>
                <ShieldCheckIcon className="mr-2 h-5 w-5" />
                {t("saml_sso")}
              </Button>
            </div>
          </div>
          {/* Already have an account & T&C */}
          <div className="mb-6 mt-auto ">
            <div className="flex flex-col text-sm">
              <Link href="/auth/login" className="text-emphasis hover:underline">
                {t("already_have_account")}
              </Link>
              <p className="text-subtle">
                <Trans i18nKey="signing_up_terms">
                  By signing up, you agree to our{" "}
                  <Link className="text-emphasis hover:underline" href={`${WEBSITE_URL}/terms`}>
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link className="text-emphasis hover:underline" href={`${WEBSITE_URL}/privacy`}>
                    Privacy Policy
                  </Link>
                  .
                </Trans>
              </p>
            </div>
          </div>
        </div>
        <div
          className="my-6 hidden w-full flex-col items-end justify-center rounded-l-lg lg:flex"
          style={{
            background: "radial-gradient(234.86% 110.55% at 109.58% 35%, #667593 0%, #D4D4D5 100%)",
          }}>
          <div className="ml-12 flex self-start">
            {/* <div className="my-5 flex gap-4 ">
              <img
                className="hidden max-h-10 md:block"
                alt="Product of the Day"
                src="/product-cards/product-of-the-day.svg"
              />
              <img
                className="max-h-10"
                alt="Product of the Week"
                src="/product-cards/product-of-the-week.svg"
              />
              <img
                className="max-h-10"
                alt="Product of the Month"
                src="/product-cards/product-of-the-month.svg"
              />
            </div> */}
            {/* <div className="mb-5 flex space-x-8">
              <img className="max-h-14" alt="4.3 Stars on Trustpilot" src="/product-cards/trustpilot.svg" />
              <img className="max-h-14 pt-1" alt="4.5 Stars on G2" src="/product-cards/g2.svg" />
              <img
                className="max-h-14 pt-1"
                alt="5 Stars on ProductHunt"
                src="/product-cards/producthunt.svg"
              />
            </div> */}
          </div>
          <img src="/mock-event-type-list.svg" alt="#" />
        </div>
        {/* <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="font-cal text-emphasis text-center text-3xl font-extrabold">
            {t("create_your_account")}
          </h2>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-default mx-2 p-6 shadow sm:rounded-lg lg:p-8">
            <FormProvider {...methods}>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  if (methods.formState?.errors?.apiError) {
                    methods.clearErrors("apiError");
                  }
                  methods.handleSubmit(signUp)(event);
                }}
                className="bg-default space-y-6">
                {errors.apiError && <Alert severity="error" message={errors.apiError?.message} />}
                <div className="space-y-4">
                  <TextField
                    addOnLeading={
                      orgSlug
                        ? getOrgFullDomain(orgSlug, { protocol: true })
                        : `${process.env.NEXT_PUBLIC_WEBSITE_URL}/`
                    }
                    {...register("username")}
                    disabled={!!orgSlug}
                    required
                  />
                  <EmailField
                    {...register("email")}
                    disabled={prepopulateFormValues?.email}
                    className="disabled:bg-emphasis disabled:hover:cursor-not-allowed"
                  />
                  <PasswordField
                    labelProps={{
                      className: "block text-sm font-medium text-default",
                    }}
                    {...register("password")}
                    hintErrors={["caplow", "min", "num"]}
                    className="border-default mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
                  />
                </div>
                <div className="flex space-x-2 rtl:space-x-reverse">
                  <Button type="submit" loading={isSubmitting} className="w-full justify-center">
                    {t("create_account")}
                  </Button>
                  {!token && (
                    <Button
                      color="secondary"
                      className="w-full justify-center"
                      onClick={() =>
                        signIn("Cal.com", {
                          callbackUrl: searchParams?.get("callbackUrl")
                            ? `${WEBAPP_URL}/${searchParams.get("callbackUrl")}`
                            : `${WEBAPP_URL}/getting-started`,
                        })
                      }>
                      {t("login_instead")}
                    </Button>
                  )}
                </div>
              </form>
            </FormProvider>
          </div>
        </div> */}
      </div>
    </>
  );
}

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

  if (process.env.NEXT_PUBLIC_DISABLE_SIGNUP === "true" || flags["disable-signup"]) {
    return {
      notFound: true,
    };
  }

  // no token given, treat as a normal signup without verification token
  if (!token) {
    return {
      props: JSON.parse(JSON.stringify(props)),
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
        destination: "/auth/login?callbackUrl=" + `${WEBAPP_URL}/${ctx.query.callbackUrl}`,
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
    ? tokenTeam.slug || tokenTeam.metadata?.requestedSlug || tokenTeam.parent?.slug
    : null;

  // Org context shouldn't check if a username is premium
  if (!IS_SELF_HOSTED && !isOrganization) {
    // Im not sure we actually hit this because of next redirects signup to website repo - but just in case this is pretty cool :)
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
      orgSlug,
    },
  };
};

Signup.isThemeSupported = false;
Signup.PageWrapper = PageWrapper;
