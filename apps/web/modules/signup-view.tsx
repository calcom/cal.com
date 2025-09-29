"use client";

import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon";
import { PasswordField, TextField } from "@calid/features/ui/components/input/input";
import { Logo } from "@calid/features/ui/components/logo";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm, useFormContext } from "react-hook-form";
import { Toaster } from "sonner";
import { z } from "zod";

import getStripe from "@calcom/app-store/stripepayment/lib/client";
import { getOrgUsernameFromEmail } from "@calcom/features/auth/signup/utils/getOrgUsernameFromEmail";
import {
  APP_NAME,
  URL_PROTOCOL_REGEX,
  WEBAPP_URL,
  CLOUDFLARE_SITE_ID,
  WEBSITE_PRIVACY_POLICY_URL,
  WEBSITE_TERMS_URL,
} from "@calcom/lib/constants";
import { fetchUsername } from "@calcom/lib/fetchUsername";
import { pushGTMEvent } from "@calcom/lib/gtm";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTelemetry } from "@calcom/lib/hooks/useTelemetry";
import { collectPageParameters, telemetryEventTypes } from "@calcom/lib/telemetry";
import { signupSchema as apiSignupSchema } from "@calcom/prisma/zod-utils";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Alert } from "@calcom/ui/components/alert";
import { Form } from "@calcom/ui/components/form";

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
  setUsernameTaken,
  orgSlug,
  usernameTaken,
  disabled,
  ...props
}: React.ComponentProps<typeof TextField> & {
  username: string;
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
        setUsernameTaken(false);
        return;
      }
      fetchUsername(debouncedUsername, orgSlug ?? null).then(({ data }) => {
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
                <span>{t("already_in_use_error")}</span>
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
  const isOrgInviteByLink = orgSlug && !prepopulateFormValues?.username;
  const [isSamlSignup, setIsSamlSignup] = useState(false);
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
    formState,
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

        //if we have token, means user was invited through email
        const verifyOrGettingStarted =
          token || !emailVerificationEnabled ? "getting-started" : "auth/verify-email";

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
      <div className="bg-default flex min-h-screen flex-col items-center justify-center p-4">
        <div className="border-default w-full max-w-7xl overflow-hidden rounded-2xl border shadow-xl">
          <div className="grid min-h-[600px] grid-cols-1 lg:grid-cols-2">
            {/* Left Column - Signup Form */}
            <div className="flex flex-col justify-center p-8 lg:p-12">
              <div className="mb-8 self-center lg:self-start">
                <h1 className="text-emphasis text-2xl font-bold lg:text-3xl">{t("create_your_account")}</h1>
              </div>

              {/* Social Login Buttons */}
              <div className="mb-4 space-y-2">
                {/* Google Button */}
                {isGoogleLoginEnabled && (
                  <Button
                    color="secondary"
                    loading={isGoogleLoading}
                    CustomStartIcon={
                      <img className="mr-3 h-5 w-5" src="/google-icon-colored.svg" alt="Google" />
                    }
                    className="text-subtle bg-primary w-full justify-center rounded-md"
                    data-testid="continue-with-google-button"
                    onClick={async () => {
                      setIsSamlSignup(false);
                      setIsGoogleLoading(true);
                      const baseUrl = process.env.NEXT_PUBLIC_WEBAPP_URL;
                      const GOOGLE_AUTH_URL = `${baseUrl}/auth/sso/google`;
                      const searchQueryParams = new URLSearchParams();
                      if (prepopulateFormValues?.username) {
                        searchQueryParams.set("username", prepopulateFormValues.username);
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
                )}
                {/* Divider */}
                {isGoogleLoginEnabled && (
                  <div className="mb-8">
                    <div className="relative flex items-center">
                      <div className="flex-grow border-t border-gray-300" />
                      <span className="text-subtle mx-4 text-sm font-medium uppercase">
                        {t("or_continue_with_email")}
                      </span>
                      <div className="flex-grow border-t border-gray-300" />
                    </div>
                  </div>
                )}
              </div>

              {/* Form Container */}
              <div>
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
                  <UsernameField
                    orgSlug={orgSlug}
                    label={t("username")}
                    username={watch("username") || ""}
                    usernameTaken={usernameTaken}
                    disabled={!!orgSlug}
                    setUsernameTaken={(value) => setUsernameTaken(value)}
                    data-testid="signup-usernamefield"
                    addOnLeading={truncateDomain(
                      `${process.env.NEXT_PUBLIC_WEBSITE_URL.replace(URL_PROTOCOL_REGEX, "")}/`
                    )}
                  />
                  {/* Email */}
                  <TextField
                    id="signup-email"
                    {...register("email")}
                    label={t("email")}
                    type="email"
                    autoComplete="email"
                    placeholder="john@example.com"
                    disabled={prepopulateFormValues?.email}
                    data-testid="signup-emailfield"
                  />
                  {/* Password */}
                  <PasswordField
                    id="signup-password"
                    data-testid="signup-passwordfield"
                    autoComplete="new-password"
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
                  {errors.apiError && (
                    <Alert
                      className="mb-3"
                      severity="error"
                      message={errors.apiError?.message}
                      data-testid="signup-error-message"
                    />
                  )}
                  <Button
                    type="submit"
                    data-testid="signup-submit-button"
                    className="bg-active border-active dark:border-default w-full justify-center py-3 dark:bg-gray-200"
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
                    {t("create_account")}
                  </Button>
                </Form>
              </div>

              {/* Already have an account & T&C */}
              <div className="mt-4">
                <div className="text-center">
                  <span className="text-subtle">{t("already_have_account")} </span>
                  <Link
                    href="/auth/login"
                    className="text-active dark:text-default font-medium hover:underline">
                    {t("sign_in")}
                  </Link>
                </div>
                <div className="text-subtle text-center text-xs">
                  By proceeding, you agree to our{" "}
                  <Link href={WEBSITE_TERMS_URL} className="text-active dark:text-default hover:underline">
                    {t("terms")}
                  </Link>{" "}
                  and{" "}
                  <Link
                    href={WEBSITE_PRIVACY_POLICY_URL}
                    className="text-active dark:text-default hover:underline">
                    {t("privacy_policy")}
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column - Welcome Section */}
            <div
              className="hidden flex-col justify-center p-8 lg:flex lg:p-12"
              style={{ background: "var(--cal-bg-gradient)" }}>
              <div className="text-center lg:text-left">
                {/* Welcome Title */}
                <div className="mb-4 space-y-2">
                  <h2 className="text-default text-3xl font-bold">Welcome to Cal ID</h2>

                  {/* Description */}
                  <span className="text-subtle text-lg leading-relaxed">
                    Cal ID provides scheduling infrastructure for absolutely everyone. Manage your calendar,
                    events, and availability with ease.
                  </span>
                </div>

                {/* Features List */}
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <div className="bg-cal-active mt-2 h-2 w-2 flex-shrink-0 rounded-full dark:bg-gray-300" />
                    <div>
                      <h3 className="text-default font-semibold">Smart scheduling algorithms</h3>
                      <span className="text-subtle text-sm">
                        Automatically find the best meeting times for everyone
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <div className="bg-cal-active mt-2 h-2 w-2 flex-shrink-0 rounded-full dark:bg-gray-300" />
                    <div>
                      <h3 className="text-default font-semibold">Calendar integrations</h3>
                      <span className="text-subtle text-sm">
                        Connect with Google, Outlook, and other calendar services
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <div className="bg-cal-active mt-2 h-2 w-2 flex-shrink-0 rounded-full dark:bg-gray-300" />
                    <div>
                      <h3 className="text-default font-semibold">Team collaboration tools</h3>
                      <span className="text-subtle text-sm">
                        Work together seamlessly with your team members
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8">
          <div className="mb-4 flex items-center self-center lg:self-start">
            <Logo small icon />
          </div>
        </div>
        <Toaster position="bottom-center" />
      </div>
    </>
  );
}
