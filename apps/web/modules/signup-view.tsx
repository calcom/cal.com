"use client";

import { Analytics as DubAnalytics } from "@dub/analytics/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useState, useEffect } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm, useFormContext } from "react-hook-form";
import { Toaster } from "sonner";
import { z } from "zod";

import getStripe from "@calcom/app-store/stripepayment/lib/client";
import { getPremiumPlanPriceValue } from "@calcom/app-store/stripepayment/lib/utils";
import { getOrgUsernameFromEmail } from "@calcom/features/auth/signup/utils/getOrgUsernameFromEmail";
import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import {
  APP_NAME,
  URL_PROTOCOL_REGEX,
  IS_CALCOM,
  WEBAPP_URL,
  CLOUDFLARE_SITE_ID,
  WEBSITE_PRIVACY_POLICY_URL,
  WEBSITE_TERMS_URL,
  WEBSITE_URL,
} from "@calcom/lib/constants";
import { isENVDev } from "@calcom/lib/env";
import { fetchUsername } from "@calcom/lib/fetchUsername";
import { pushGTMEvent } from "@calcom/lib/gtm";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTelemetry } from "@calcom/lib/hooks/useTelemetry";
import { collectPageParameters, telemetryEventTypes } from "@calcom/lib/telemetry";
import { IS_EUROPE } from "@calcom/lib/timezoneConstants";
import { signupSchema as apiSignupSchema } from "@calcom/prisma/zod-utils";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import classNames from "@calcom/ui/classNames";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { PasswordField, CheckboxField, TextField, Form } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

import type { getServerSideProps } from "@lib/signup/getServerSideProps";

const signupSchema = apiSignupSchema.extend({
  apiError: z.string().optional(), // Needed to display API errors doesn't get passed to the API
  cfToken: z.string().optional(),
});

const TurnstileCaptcha = dynamic(() => import("@calcom/features/auth/Turnstile"), { ssr: false });

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

function truncateDomain(domain: string) {
  const maxLength = 25;
  const cleanDomain = domain.replace(URL_PROTOCOL_REGEX, "");

  if (cleanDomain.length <= maxLength) {
    return cleanDomain;
  }

  return `${cleanDomain.substring(0, maxLength - 3)}.../`;
}

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedUsername, disabled, orgSlug, formState.isSubmitting, formState.isSubmitSuccessful]);

  return (
    <div>
      <TextField
        disabled={disabled}
        {...props}
        {...register("username")}
        data-testid="signup-usernamefield"
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
                    interpolation: { escapeValue: false },
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
  onboardingV3Enabled,
}: SignupProps) {
  const isOrgInviteByLink = orgSlug && !prepopulateFormValues?.username;
  const [isSamlSignup, setIsSamlSignup] = useState(false);
  const [premiumUsername, setPremiumUsername] = useState(false);
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [displayEmailForm, setDisplayEmailForm] = useState(token);
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
      // eslint-disable-next-line @calcom/eslint/avoid-web-storage
      localStorage.setItem("onBoardingRedirect", redirectUrl);
    }
  }, [redirectUrl]);

  const [userConsentToCookie, setUserConsentToCookie] = useState(false); // No need to be checked for user to proceed

  function handleConsentChange(consent: boolean) {
    setUserConsentToCookie(!consent);
  }

  const loadingSubmitState = isSubmitSuccessful || isSubmitting;
  const displayBackButton = token ? false : displayEmailForm;

  const handleErrorsAndStripe = async (resp: Response) => {
    if (!resp.ok) {
      const err = await resp.json();
      if (err.checkoutSessionId) {
        const stripe = await getStripe();
        if (stripe) {
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

        const gettingStartedPath = onboardingV3Enabled ? "onboarding/getting-started" : "getting-started";
        const verifyOrGettingStarted = emailVerificationEnabled ? "auth/verify-email" : gettingStartedPath;
        const gettingStartedWithPlatform = "settings/platform/new";

        const constructCallBackIfUrlPresent = () => {
          if (isOrgInviteByLink) {
            return `${WEBAPP_URL}/${searchParams.get("callbackUrl")}`;
          }

          return addOrUpdateQueryParam(`${WEBAPP_URL}/${searchParams.get("callbackUrl")}`, "from", "signup");
        };

        const constructCallBackIfUrlNotPresent = () => {
          if (isPlatformUser) {
            return `${WEBAPP_URL}/${gettingStartedWithPlatform}?from=signup`;
          }

          return `${WEBAPP_URL}/${verifyOrGettingStarted}?from=signup`;
        };

        const constructCallBackUrl = () => {
          const callbackUrlSearchParams = searchParams?.get("callbackUrl");

          return callbackUrlSearchParams
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
      {IS_CALCOM && (!IS_EUROPE || userConsentToCookie) ? (
        <>
          {process.env.NEXT_PUBLIC_GTM_ID && (
            <>
              <Script
                id="gtm-init-script"
                // It is strictly not necessary to disable, but in a future update of react/no-danger this will error.
                // And we don't want it to error here anyways
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: `(function (w, d, s, l, i) {
                        w[l] = w[l] || []; w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
                        var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : '';
                        j.async = true; j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f);
                    })(window, document, 'script', 'dataLayer', '${process.env.NEXT_PUBLIC_GTM_ID}');`,
                }}
              />
              <noscript
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
                }}
              />
            </>
          )}
          <DubAnalytics
            apiHost="/_proxy/dub"
            cookieOptions={{
              domain: isENVDev ? undefined : `.${new URL(WEBSITE_URL).hostname}`,
            }}
            domainsConfig={{
              refer: "refer.cal.com",
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
          {/* Left side */}
          <div className="ml-auto mr-auto mt-0 flex w-full max-w-xl flex-col px-4 pt-6 sm:px-16 md:px-20 lg:mt-24 2xl:px-28">
            {displayBackButton && (
              <div className="flex w-fit lg:-mt-12">
                <Button
                  color="minimal"
                  className="hover:bg-subtle todesktop:mt-10 mb-6 flex h-6 max-h-6 w-full items-center rounded-md px-3 py-2"
                  StartIcon="arrow-left"
                  data-testid="signup-back-button"
                  onClick={() => {
                    setDisplayEmailForm(false);
                    setIsSamlSignup(false);
                  }}>
                  {t("back")}
                </Button>
              </div>
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
            {displayEmailForm && (
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
                          ? truncateDomain(
                              `${getOrgFullOrigin(orgSlug, { protocol: true }).replace(
                                URL_PROTOCOL_REGEX,
                                ""
                              )}/`
                            )
                          : truncateDomain(
                              `${process.env.NEXT_PUBLIC_WEBSITE_URL.replace(URL_PROTOCOL_REGEX, "")}/`
                            )
                      }
                    />
                  ) : null}
                  {/* Email */}
                  <TextField
                    id="signup-email"
                    {...register("email")}
                    label={t("email")}
                    placeholder="john@doe.com"
                    type="email"
                    autoComplete="email"
                    disabled={prepopulateFormValues?.email}
                    data-testid="signup-emailfield"
                  />

                  {/* Password */}
                  {!isSamlSignup && (
                    <PasswordField
                      id="signup-password"
                      data-testid="signup-passwordfield"
                      autoComplete="new-password"
                      label={t("password")}
                      {...register("password")}
                      hintErrors={["caplow", "min", "num"]}
                    />
                  )}
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
                    data-testid="signup-cookie-content-checkbox"
                    onChange={() => handleConsentChange(userConsentToCookie)}
                    description={t("cookie_consent_checkbox")}
                  />
                  {errors.apiError && (
                    <Alert
                      className="mb-3"
                      severity="error"
                      message={errors.apiError?.message}
                      data-testid="signup-error-message"
                    />
                  )}
                  {isSamlSignup ? (
                    <Button
                      data-testid="saml-submit-button"
                      color="primary"
                      disabled={
                        !!formMethods.formState.errors.username ||
                        !!formMethods.formState.errors.email ||
                        !formMethods.getValues("email") ||
                        !formMethods.getValues("username") ||
                        premiumUsername ||
                        isSubmitting
                      }
                      onClick={() => {
                        const username = formMethods.getValues("username");
                        if (!username) {
                          // should not be reached but needed to bypass type errors
                          showToast("error", t("username_required"));
                          return;
                        }
                        // eslint-disable-next-line @calcom/eslint/avoid-web-storage
                        localStorage.setItem("username", username);
                        const sp = new URLSearchParams();
                        // @NOTE: don't remove username query param as it's required right now for stripe payment page
                        sp.set("username", username);
                        sp.set("email", formMethods.getValues("email"));
                        router.push(
                          `${process.env.NEXT_PUBLIC_WEBAPP_URL}/auth/sso/saml` + `?${sp.toString()}`
                        );
                      }}
                      className={classNames(
                        "my-2 w-full justify-center rounded-md text-center",
                        formMethods.formState.errors.username && formMethods.formState.errors.email
                          ? "opacity-50"
                          : ""
                      )}>
                      <Icon name="shield-check" className="mr-2 h-5 w-5" />
                      {t("create_account_with_saml")}
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      data-testid="signup-submit-button"
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
                        ? `${t("get_started")} (${getPremiumPlanPriceValue()})`
                        : t("get_started")}
                    </Button>
                  )}
                </Form>
              </div>
            )}
            {!displayEmailForm && (
              <div className="mt-12">
                {/* Upper Row */}
                <div className="mt-6 flex flex-col gap-2 md:flex-row">
                  {isGoogleLoginEnabled ? (
                    <Button
                      color="primary"
                      loading={isGoogleLoading}
                      CustomStartIcon={
                        <img
                          className={classNames("text-subtle  mr-2 h-4 w-4", premiumUsername && "opacity-50")}
                          src="/google-icon-colored.svg"
                          alt="Continue with Google Icon"
                        />
                      }
                      className={classNames("w-full justify-center rounded-md text-center")}
                      data-testid="continue-with-google-button"
                      onClick={async () => {
                        setIsSamlSignup(false);
                        setIsGoogleLoading(true);
                        const baseUrl = process.env.NEXT_PUBLIC_WEBAPP_URL;
                        const GOOGLE_AUTH_URL = `${baseUrl}/auth/sso/google`;
                        const searchQueryParams = new URLSearchParams();
                        if (prepopulateFormValues?.username) {
                          // If username is present we save it in query params to check for premium
                          searchQueryParams.set("username", prepopulateFormValues.username);
                          // eslint-disable-next-line @calcom/eslint/avoid-web-storage
                          localStorage.setItem("username", prepopulateFormValues.username);
                        }
                        if (token) {
                          searchQueryParams.set("email", prepopulateFormValues?.email);
                        }
                        const url = searchQueryParams.toString()
                          ? `${GOOGLE_AUTH_URL}?${searchQueryParams.toString()}`
                          : GOOGLE_AUTH_URL;

                        router.push(url);
                      }}>
                      {t("continue_with_google")}
                    </Button>
                  ) : null}
                </div>

                {isGoogleLoginEnabled && (
                  <div className="mt-6">
                    <div className="relative flex items-center">
                      <div className="border-subtle flex-grow border-t" />
                      <span className="text-subtle mx-2 flex-shrink text-sm font-normal leading-none">
                        {t("or").toLocaleLowerCase()}
                      </span>
                      <div className="border-subtle flex-grow border-t" />
                    </div>
                  </div>
                )}

                {/* Lower Row */}
                <div className="mt-6 flex flex-col gap-2">
                  <Button
                    color="secondary"
                    disabled={isGoogleLoading}
                    className={classNames("w-full justify-center rounded-md text-center")}
                    onClick={() => {
                      setDisplayEmailForm(true);
                      setIsSamlSignup(false);
                    }}
                    data-testid="continue-with-email-button">
                    {t("continue_with_email")}
                  </Button>
                  {isSAMLLoginEnabled && (
                    <Button
                      data-testid="continue-with-saml-button"
                      color="minimal"
                      disabled={isGoogleLoading}
                      className={classNames("w-full justify-center rounded-md text-center")}
                      onClick={() => {
                        setDisplayEmailForm(true);
                        setIsSamlSignup(true);
                      }}>
                      {`${t("or").toLocaleLowerCase()} ${t("saml_sso")}`}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Already have an account & T&C */}
            <div className="mt-10 flex h-full flex-col justify-end pb-6 text-xs">
              <div className="flex flex-col text-sm">
                <div className="flex gap-1">
                  <p className="text-subtle">{t("already_have_account")}</p>
                  <Link href="/auth/login" className="text-emphasis hover:underline">
                    {t("sign_in")}
                  </Link>
                </div>
                <div className="text-subtle">
                  <ServerTrans
                    t={t}
                    i18nKey="signing_up_terms"
                    components={[
                      <Link
                        className="text-emphasis hover:underline"
                        key="terms"
                        href={`${WEBSITE_TERMS_URL}`}
                        target="_blank">
                        Terms
                      </Link>,
                      <Link
                        className="text-emphasis hover:underline"
                        key="privacy"
                        href={`${WEBSITE_PRIVACY_POLICY_URL}`}
                        target="_blank">
                        Privacy Policy.
                      </Link>,
                    ]}
                  />
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
                      src="/product-cards/google-reviews.svg"
                      className="h-[54px] w-full"
                      alt="Google Reviews Rating of 4.7 Stars"
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
              {FEATURES.map((feature, index) => (
                <div key={index} className="max-w-52 mb-8 flex flex-col leading-none sm:mb-0">
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
              ))}
            </div>
          </div>
        </div>
        <Toaster position="bottom-right" />
      </div>
    </>
  );
}
