"use client";

import { Button } from "@calid/features/ui/components/button";
import { PasswordField, TextField } from "@calid/features/ui/components/input/input";
import { Logo } from "@calid/features/ui/components/logo";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { Toaster } from "sonner";
import { z } from "zod";

import getStripe from "@calcom/app-store/stripepayment/lib/client";
import { getOrgUsernameFromEmail } from "@calcom/features/auth/signup/utils/getOrgUsernameFromEmail";
import {
  WEBAPP_URL,
  CLOUDFLARE_SITE_ID,
  WEBSITE_PRIVACY_POLICY_URL,
  WEBSITE_TERMS_URL,
} from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTelemetry } from "@calcom/lib/hooks/useTelemetry";
import { collectPageParameters, telemetryEventTypes } from "@calcom/lib/telemetry";
import { captureAndStoreUtmParams } from "@calcom/lib/utm";
import { localStorage } from "@calcom/lib/webstorage";
import { signupSchema as apiSignupSchema } from "@calcom/prisma/zod-utils";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Alert } from "@calcom/ui/components/alert";
import { Form } from "@calcom/ui/components/form";

import { isOpenedInWebView as isWebView } from "@lib/isWebView";
import type { getServerSideProps } from "@lib/signup/getServerSideProps";

import WebViewBlocker from "@components/webview-blocker";

const signupSchema = apiSignupSchema.extend({
  apiError: z.string().optional(),
  cfToken: z.string().optional(),
});

const TurnstileCaptcha = dynamic(() => import("@calcom/features/auth/Turnstile"), { ssr: false });

type FormValues = z.infer<typeof signupSchema>;

export type SignupProps = inferSSRProps<typeof getServerSideProps>;

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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({
    label: "",
    bars: 0,
    textClass: "",
    barClass: "",
  });
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    hasLower: false,
    hasUpper: false,
    hasNumber: false,
    hasSpecial: false,
    noRepeat: true,
  });

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
    formState: { isSubmitting, errors, isSubmitSuccessful },
    watch,
  } = formMethods;

  const watchedEmail = watch("email");
  const watchedPassword = watch("password");
  const watchedCfToken = watch("cfToken");

  useEffect(() => {
    captureAndStoreUtmParams();
  }, []);

  useEffect(() => {
    if (redirectUrl) {
      localStorage.setItem("onBoardingRedirect", redirectUrl);
    }
  }, [redirectUrl]);

  // Password strength checker
  useEffect(() => {
    const regex = {
      lower: /[a-z]/,
      upper: /[A-Z]/,
      number: /[0-9]/,
      special: /[^A-Za-z0-9]/,
      repeat: /(.)\1{2,}/,
    };

    const checks = {
      length: passwordValue.length >= 8,
      hasLower: regex.lower.test(passwordValue),
      hasUpper: regex.upper.test(passwordValue),
      hasNumber: regex.number.test(passwordValue),
      hasSpecial: regex.special.test(passwordValue),
      noRepeat: !regex.repeat.test(passwordValue),
    };

    setPasswordChecks(checks);

    let score = 0;
    if (checks.length) score++;
    if (checks.hasLower && checks.hasUpper) score++;
    if (checks.hasNumber) score++;
    if (checks.hasSpecial) score++;

    const strengthLevels = {
      empty: { label: "", bars: 0, textClass: "", barClass: "" },
      weak: { label: "Too weak", bars: 1, textClass: "text-red-500", barClass: "bg-red-500" },
      acceptable: { label: "Acceptable", bars: 2, textClass: "text-amber-500", barClass: "bg-amber-500" },
      strong: { label: "Strong", bars: 3, textClass: "text-green-600", barClass: "bg-green-600" },
    };

    let level = strengthLevels.weak;
    if (checks.length && checks.noRepeat) {
      if (score >= 4) level = strengthLevels.strong;
      else if (score >= 2) level = strengthLevels.acceptable;
    }

    if (passwordValue.length === 0) level = strengthLevels.empty;

    setPasswordStrength(level);
  }, [passwordValue]);

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
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: "email_signup_success",
          signup_method: "email",
          email_address: data.email,
        });

        telemetry.event(telemetryEventTypes.signup, collectPageParameters());

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

  const [inWebView, setInWebView] = useState(false);

  useEffect(() => {
    setInWebView(isWebView());
  }, []);

  const RequirementItem = ({ check, label }: { check: boolean; label: string }) => (
    <p
      className={`flex items-center text-xs transition-all duration-300 ${
        check ? "text-green-600" : "text-gray-200"
      }`}>
      {check ? (
        <svg
          className="mr-2 h-3 w-3 scale-110 transform transition-transform duration-300"
          fill="currentColor"
          viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <span className="mr-2 h-1.5 w-1.5 rounded-full bg-gray-400"></span>
      )}
      {label}
    </p>
  );

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

        * {
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        body {
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .google-btn-premium:hover .google-icon-premium {
          transform: rotate(-8deg) scale(1.05);
        }

        .google-icon-premium {
          transition: transform 0.3s ease-out;
        }

        .btn-premium-submit {
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .btn-premium-submit:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px rgba(0, 126, 229, 0.45);
        }

        .btn-premium-submit:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 5px 20px rgba(0, 126, 229, 0.3);
        }

        .btn-premium-submit:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
      `}</style>

      <div className="dark:bg-default flex  min-h-screen flex-col items-center justify-center bg-[#F0F5FF] p-4">
        <div className="bg-default dark:border-gray-550 w-full max-w-7xl overflow-hidden rounded-3xl border shadow-xl md:max-w-[600px] dark:shadow-none">
          <div className="min-h-[600px]">
            {/* Left Column - Signup Form */}
            <div className="flex flex-col justify-center p-8 lg:p-12">
              <div className="fade-in-up mb-8">
                <h1 className="text-emphasis mb-2 text-2xl font-bold">{t("get_started")}</h1>
                <p className="text-default font-medium">Create your Cal ID account</p>
              </div>

              {/* Social Login Buttons */}
              <div className="mb-4 space-y-2">
                {/* Google Button or WebView Blocker */}
                {inWebView ? (
                  <WebViewBlocker />
                ) : (
                  isGoogleLoginEnabled && (
                    <div className="fade-in-up relative" style={{ animationDelay: "100ms" }}>
                      <Button
                        color="secondary"
                        loading={isGoogleLoading}
                        CustomStartIcon={
                          <img
                            className="google-icon-premium mr-3 h-5 w-5"
                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/1024px-Google_%22G%22_logo.svg.png"
                            alt="Google"
                          />
                        }
                        className="google-btn-premium w-full justify-center rounded-lg border border-gray-300 px-4 py-3 font-semibold shadow-sm hover:border-gray-400 hover:bg-gray-50"
                        data-testid="continue-with-google-button"
                        onClick={async () => {
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
                      <span className="absolute -top-3 right-2 z-10 rounded-full bg-[#007ee5] px-2.5 py-1 text-xs font-semibold text-white shadow">
                        ⭐ Popular
                      </span>
                    </div>
                  )
                )}

                {/* Divider */}
                {isGoogleLoginEnabled && (
                  <div className="fade-in-up my-6" style={{ animationDelay: "200ms" }}>
                    <div className="relative flex items-center">
                      <div className="flex-grow border-t border-gray-200" />
                      <span className="text-default px-4 text-sm font-medium">{t("or")}</span>
                      <div className="flex-grow border-t border-gray-200" />
                    </div>
                  </div>
                )}
              </div>

              {/* Form Container */}
              <div className="fade-in-up" style={{ animationDelay: "300ms" }}>
                <Form
                  className="flex flex-col gap-4"
                  form={formMethods}
                  handleSubmit={async (values) => {
                    let updatedValues = values;
                    if (!formMethods.getValues().username) {
                      updatedValues = {
                        ...values,
                        username: getOrgUsernameFromEmail(values.email, orgAutoAcceptEmail),
                      };
                    }
                    await signUp(updatedValues);
                  }}>
                  {/* Email */}
                  <TextField
                    id="signup-email"
                    size="lg"
                    variant="floating"
                    prefixIcon="mail"
                    {...register("email")}
                    noLabel={true}
                    type="email"
                    autoComplete="email"
                    placeholder="Email Id"
                    disabled={prepopulateFormValues?.email}
                    data-testid="signup-emailfield"
                  />

                  {/* Password */}
                  <div>
                    <PasswordField
                      id="signup-password"
                      size="lg"
                      data-testid="signup-passwordfield"
                      prefixIcon="lock"
                      autoComplete="new-password"
                      // disabled={!formMethods.getValues("email")}
                      label={t("password")}
                      variant="floating"
                      showStrengthMeter={true}
                      showStrengthColors={true}
                      showRequirements={true}
                      {...register("password")}
                    />
                  </div>

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
                    className="w-full justify-center rounded-lg py-3 font-semibold "
                    loading={loadingSubmitState}
                    disabled={
                      !!formMethods.formState.errors.email ||
                      !watchedEmail ||
                      !watchedPassword ||
                      (CLOUDFLARE_SITE_ID &&
                        !process.env.NEXT_PUBLIC_IS_E2E &&
                        !watchedCfToken) ||
                      isSubmitting
                    }>
                    {t("create_account")}
                  </Button>
                </Form>
              </div>

              {/* Already have an account & T&C */}
              <div className="fade-in-up mt-6" style={{ animationDelay: "400ms" }}>
                <div className="text-center">
                  <span className="text-default font-medium">{t("already_have_account")} </span>
                  <Link
                    href="/auth/login"
                    className="font-semibold text-[#007ee5] hover:text-[#006ac1] hover:underline">
                    {t("sign_in")}
                  </Link>
                </div>
                <div className="text-default mt-4 text-center text-xs">
                  By proceeding, you agree to our{" "}
                  <Link href={WEBSITE_TERMS_URL} className="font-medium text-[#007ee5] hover:underline">
                    {t("terms")}
                  </Link>{" "}
                  and{" "}
                  <Link
                    href={WEBSITE_PRIVACY_POLICY_URL}
                    className="font-medium text-[#007ee5] hover:underline">
                    {t("privacy_policy")}
                  </Link>
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
