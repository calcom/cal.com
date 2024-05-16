"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { Trans } from "next-i18next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useState, useEffect } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm, useFormContext } from "react-hook-form";
import { Toaster } from "react-hot-toast";
import { z } from "zod";

import getStripe from "@calcom/app-store/stripepayment/lib/client";
import { getPremiumPlanPriceValue } from "@calcom/app-store/stripepayment/lib/utils";
import { getOrgUsernameFromEmail } from "@calcom/features/auth/signup/utils/getOrgUsernameFromEmail";
import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { classNames } from "@calcom/lib";
import {
  APP_NAME,
  URL_PROTOCOL_REGEX,
  IS_CALCOM,
  WEBAPP_URL,
  WEBSITE_URL,
  CLOUDFLARE_SITE_ID,
} from "@calcom/lib/constants";
import { fetchUsername } from "@calcom/lib/fetchUsername";
import { pushGTMEvent } from "@calcom/lib/gtm";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { signupSchema as apiSignupSchema } from "@calcom/prisma/zod-utils";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import {
  Button,
  HeadSeo,
  PasswordField,
  TextField,
  Form,
  Alert,
  showToast,
  CheckboxField,
  Icon,
} from "@calcom/ui";

import { getServerSideProps } from "@lib/signup/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

const signupSchema = apiSignupSchema.extend({
  apiError: z.string().optional(), // Needed to display API errors doesnt get passed to the API
  cfToken: z.string().optional(),
});

const TurnstileCaptcha = dynamic(() => import("@components/auth/Turnstile"), { ssr: false });

type FormValues = z.infer<typeof signupSchema>;

export type SignupProps = inferSSRProps<typeof getServerSideProps>;

const FEATURES = [
  {
    title: "connect_all_calendars",
    description: "connect_all_calendars_description",
    i18nOptions: {
      appName: APP_NAME,
    },
    icon: "calendar-heart" as const,
  },
  {
    title: "set_availability",
    description: "set_availbility_description",
    icon: "users" as const,
  },
  {
    title: "share_a_link_or_embed",
    description: "share_a_link_or_embed_description",
    icon: "link-2" as const,
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
  orgSlug,
  usernameTaken,
  disabled,
  ...props
}: React.ComponentProps<typeof TextField> & {
  username: string;
  setPremium: (value: boolean) => void;
  premium: boolean;
  usernameTaken: boolean;
  orgSlug?: string;
  setUsernameTaken: (value: boolean) => void;
}) {
  const { t } = useLocale();
  const { register, formState } = useFormContext<FormValues>();
  const debouncedUsername = useDebounce(username, 600);

  useEffect(() => {
    if (formState.isSubmitting || formState.isSubmitSuccessful) return;

    async function checkUsername() {
      // If the username can't be changed, there is no point in doing the username availability check
      if (disabled) return;
      if (!debouncedUsername) {
        setPremium(false);
        setUsernameTaken(false);
        return;
      }
      fetchUsername(debouncedUsername, orgSlug ?? null).then(({ data }) => {
        setPremium(data.premium);
        setUsernameTaken(!data.available);
      });
    }
    checkUsername();
  }, [
    debouncedUsername,
    setPremium,
    disabled,
    orgSlug,
    setUsernameTaken,
    formState.isSubmitting,
    formState.isSubmitSuccessful,
  ]);

  return (
    <div>
      <TextField
        disabled={disabled}
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
                <Icon name="info" className="mr-1 inline-block h-4 w-4" />
                <p>{t("already_in_use_error")}</p>
              </div>
            ) : premium ? (
              <div data-testid="premium-username-warning" className="flex items-center">
                <Icon name="star" className="mr-1 inline-block h-4 w-4" />
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
  redirectUrl,
  emailVerificationEnabled,
}: SignupProps) {
  const [premiumUsername, setPremiumUsername] = useState(false);
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const searchParams = useCompatSearchParams();
  const telemetry = useTelemetry();
  const { t, i18n } = useLocale();
  const router = useRouter();
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

  useEffect(() => {
    if (redirectUrl) {
      localStorage.setItem("onBoardingRedirect", redirectUrl);
    }
  }, [redirectUrl]);

  const [COOKIE_CONSENT, setCOOKIE_CONSENT] = useState(false);

  function handleConsentChange(consent: boolean) {
    setCOOKIE_CONSENT(!consent);
  }

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
  const isPlatformUser = redirectUrl?.includes("platform") && redirectUrl?.includes("new");

  const signUp: SubmitHandler<FormValues> = async (_data) => {
    const { cfToken, ...data } = _data;
    await fetch("/api/auth/signup", {
      body: JSON.stringify({
        ...data,
        language: i18n.language,
        token,
      }),
      headers: {
        "Content-Type": "application/json",
        "cf-access-token": cfToken ?? "invalid-token",
      },
      method: "POST",
    })
      .then(handleErrorsAndStripe)
      .then(async () => {
        if (process.env.NEXT_PUBLIC_GTM_ID)
          pushGTMEvent("create_account", { email: data.email, user: data.username, lang: data.language });

        telemetry.event(telemetryEventTypes.signup, collectPageParameters());

        const verifyOrGettingStarted = emailVerificationEnabled ? "auth/verify-email" : "getting-started";
        const gettingStartedWithPlatform = "settings/platform/new";

        const constructCallBackIfUrlPresent = () => {
          if (isOrgInviteByLink) {
            return `${WEBAPP_URL}/${searchParams.get("callbackUrl")}`;
          }

          return addOrUpdateQueryParam(`${WEBAPP_URL}/${searchParams.get("callbackUrl")}`, "from", "signup");
        };

        const constructCallBackIfUrlNotPresent = () => {
          if (!!isPlatformUser) {
            return `${WEBAPP_URL}/${gettingStartedWithPlatform}?from=signup`;
          }

          return `${WEBAPP_URL}/${verifyOrGettingStarted}?from=signup`;
        };

        const constructCallBackUrl = () => {
          const callbackUrlSearchParams = searchParams?.get("callbackUrl");

          return !!callbackUrlSearchParams
            ? constructCallBackIfUrlPresent()
            : constructCallBackIfUrlNotPresent();
        };

        const callBackUrl = constructCallBackUrl();

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
    <>
      {IS_CALCOM && COOKIE_CONSENT && process.env.NEXT_PUBLIC_GTM_ID ? (
        <>
          <Script
            id="gtm-init-script"
            dangerouslySetInnerHTML={{
              __html: `(function (w, d, s, l, i) {
                        w[l] = w[l] || []; w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
                        var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : '';
                        j.async = true; j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f);
                    })(window, document, 'script', 'dataLayer', '${process.env.NEXT_PUBLIC_GTM_ID}');`,
            }}
          />
          <noscript
            dangerouslySetInnerHTML={{
              __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
            }}
          />
        </>
      ) : null}
      <div
        className={classNames(
          "light bg-muted 2xl:bg-default flex min-h-screen w-full flex-col items-center justify-center [--cal-brand:#111827] dark:[--cal-brand:#FFFFFF]",
          "[--cal-brand-subtle:#9CA3AF]",
          "[--cal-brand-text:#FFFFFF] dark:[--cal-brand-text:#000000]",
          "[--cal-brand-emphasis:#101010] dark:[--cal-brand-emphasis:#e1e1e1] "
        )}>
        <div className="bg-muted 2xl:border-subtle grid w-full max-w-[1440px] grid-cols-1 grid-rows-1 overflow-hidden lg:grid-cols-2 2xl:rounded-[20px] 2xl:border 2xl:py-6">
          <HeadSeo title={t("sign_up")} description={t("sign_up")} />
          {/* Left side */}
          <div className="ml-auto mr-auto mt-0 flex w-full max-w-xl flex-col px-4 pt-6 sm:px-16 md:px-20 lg:mt-12 2xl:px-28">
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
            <div className="mt-12">
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
                    orgSlug={orgSlug}
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
                        ? `${getOrgFullOrigin(orgSlug, { protocol: true }).replace(URL_PROTOCOL_REGEX, "")}/`
                        : `${process.env.NEXT_PUBLIC_WEBSITE_URL.replace(URL_PROTOCOL_REGEX, "")}/`
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
                {/* Cloudflare Turnstile Captcha */}
                {CLOUDFLARE_SITE_ID ? (
                  <TurnstileCaptcha
                    appearance="interaction-only"
                    onVerify={(token) => {
                      formMethods.setValue("cfToken", token);
                    }}
                  />
                ) : null}

                <CheckboxField
                  onChange={() => handleConsentChange(COOKIE_CONSENT)}
                  description={t("cookie_consent_checkbox")}
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
                    (CLOUDFLARE_SITE_ID &&
                      !process.env.NEXT_PUBLIC_IS_E2E &&
                      !formMethods.getValues("cfToken")) ||
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
                      CustomStartIcon={
                        <img
                          className={classNames(
                            "text-subtle  mr-2 h-4 w-4 dark:invert",
                            premiumUsername && "opacity-50"
                          )}
                          src="/google-icon.svg"
                          alt=""
                        />
                      }
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
                      <Icon name="shield-check" className="mr-2 h-5 w-5" />
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
                <div className="text-subtle ">
                  <Trans i18nKey="signing_up_terms">
                    By proceeding, you agree to our{" "}
                    <Link
                      className="text-emphasis hover:underline"
                      href={`${WEBSITE_URL}/terms`}
                      target="_blank">
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link
                      className="text-emphasis hover:underline"
                      href={`${WEBSITE_URL}/privacy`}
                      target="_blank">
                      Privacy Policy
                    </Link>
                    .
                  </Trans>
                </div>
              </div>
            </div>
          </div>
          <div className="border-subtle lg:bg-subtle mx-auto mt-24 w-full max-w-2xl flex-col justify-between rounded-l-2xl pl-4 dark:bg-none lg:mt-0 lg:flex lg:max-w-full lg:border lg:py-12 lg:pl-12">
            {IS_CALCOM && (
              <>
                <div className="-mt-4 mb-6 mr-12 grid w-full grid-cols-3 gap-5 pr-4 sm:gap-3 lg:grid-cols-4">
                  <div>
                    <img
                      src="/product-cards/product-of-the-day.svg"
                      className="h-[34px] w-full dark:invert"
                      alt="Cal.com was Product of the Day at ProductHunt"
                    />
                  </div>
                  <div>
                    <img
                      src="/product-cards/product-of-the-week.svg"
                      className="h-[34px] w-full dark:invert"
                      alt="Cal.com was Product of the Week at ProductHunt"
                    />
                  </div>
                  <div>
                    <img
                      src="/product-cards/product-of-the-month.svg"
                      className="h-[34px] w-full dark:invert"
                      alt="Cal.com was Product of the Month at ProductHunt"
                    />
                  </div>
                </div>
                <div className="mb-6 mr-12 grid w-full grid-cols-3 gap-5 pr-4 sm:gap-3 lg:grid-cols-4">
                  <div>
                    <img
                      src="/product-cards/producthunt.svg"
                      className="h-[54px] w-full"
                      alt="ProductHunt Rating of 5 Stars"
                    />
                  </div>
                  <div>
                    <img
                      src="/product-cards/trustpilot.svg"
                      className="block h-[54px] w-full dark:hidden"
                      alt="Trustpilot Rating of 4.7 Stars"
                    />
                    <img
                      src="/product-cards/trustpilot-dark.svg"
                      className="hidden h-[54px] w-full dark:block"
                      alt="Trustpilot Rating of 4.7 Stars"
                    />
                  </div>
                  <div>
                    <img
                      src="/product-cards/g2.svg"
                      className="h-[54px] w-full"
                      alt="G2 Rating of 4.7 Stars"
                    />
                  </div>
                </div>
              </>
            )}
            <div className="border-default hidden rounded-bl-2xl rounded-br-none rounded-tl-2xl border border-r-0 border-dashed bg-black/[3%] dark:bg-white/5 lg:block lg:py-[6px] lg:pl-[6px]">
              <img className="block dark:hidden" src="/mock-event-type-list.svg" alt="Cal.com Booking Page" />
              <img
                className="hidden dark:block"
                src="/mock-event-type-list-dark.svg"
                alt="Cal.com Booking Page"
              />
            </div>
            <div className="mr-12 mt-8 hidden h-full w-full grid-cols-3 gap-4 overflow-hidden lg:grid">
              {FEATURES.map((feature) => (
                <>
                  <div className="max-w-52 mb-8 flex flex-col leading-none sm:mb-0">
                    <div className="text-emphasis items-center">
                      <Icon name={feature.icon} className="mb-1 h-4 w-4" />
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
    </>
  );
}

export { getServerSideProps };

Signup.PageWrapper = PageWrapper;
