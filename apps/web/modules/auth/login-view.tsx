"use client";

import { Button } from "@calid/features/ui/components/button";
import { EmailField, PasswordField } from "@calid/features/ui/components/input/input";
import { Logo } from "@calid/features/ui/components/logo";
import { zodResolver } from "@hookform/resolvers/zod";
import classNames from "classnames";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { emailRegex } from "@calcom/lib/emailSchema";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { LastUsed, useLastUsed } from "@calcom/lib/hooks/useLastUsed";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTelemetry } from "@calcom/lib/hooks/useTelemetry";
import { collectPageParameters, telemetryEventTypes } from "@calcom/lib/telemetry";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";

import { isOpenedInWebView as isWebView } from "@lib/isWebView";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

import AddToHomescreen from "@components/AddToHomescreen";
import BackupCode from "@components/auth/BackupCode";
import TwoFactor from "@components/auth/TwoFactor";
import WebViewBlocker from "@components/webview-blocker";

import type { getServerSideProps } from "@server/lib/auth/login/getServerSideProps";

interface LoginValues {
  email: string;
  password: string;
  totpCode: string;
  backupCode: string;
  csrfToken: string;
}

const GoogleIcon = () => (
  <img
    className="google-icon-premium mr-3 h-5 w-5"
    src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/1024px-Google_%22G%22_logo.svg.png"
    alt="Google"
  />
);

export type PageProps = inferSSRProps<typeof getServerSideProps>;

export default function Login({
  csrfToken,
  isGoogleLoginEnabled,
  isSAMLLoginEnabled,
  samlTenantID,
  samlProductID,
  totpEmail,
}: PageProps) {
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();
  const router = useRouter();

  const formSchema = z
    .object({
      email: z
        .string()
        .min(1, `${t("error_required_field")}`)
        .regex(emailRegex, `${t("enter_valid_email")}`),
      ...(!!totpEmail ? {} : { password: z.string().min(1, `${t("error_required_field")}`) }),
    })
    .passthrough();

  const methods = useForm<LoginValues>({ resolver: zodResolver(formSchema) });
  const { register, formState } = methods;
  const [twoFactorRequired, setTwoFactorRequired] = useState(!!totpEmail || false);
  const [twoFactorLostAccess, setTwoFactorLostAccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUsed, setLastUsed] = useLastUsed();

  const errorMessages: { [key: string]: string } = {
    [ErrorCode.IncorrectEmailPassword]: t("incorrect_email_password"),
    [ErrorCode.IncorrectTwoFactorCode]: `${t("incorrect_2fa_code")} ${t("please_try_again")}`,
    [ErrorCode.InternalServerError]: `${t("something_went_wrong")} ${t("please_try_again_and_contact_us")}`,
    [ErrorCode.ThirdPartyIdentityProviderEnabled]: t("account_created_with_identity_provider"),
  };

  const telemetry = useTelemetry();

  let callbackUrl = searchParams?.get("callbackUrl") || "/home";

  if (/"\//.test(callbackUrl)) callbackUrl = callbackUrl.substring(1);

  if (!/^https?:\/\//.test(callbackUrl)) {
    callbackUrl = `${WEBAPP_URL}/${callbackUrl}`;
  }

  const safeCallbackUrl = getSafeRedirectUrl(callbackUrl);
  callbackUrl = safeCallbackUrl || "";

  const TwoFactorFooter = (
    <>
      <Button
        onClick={() => {
          if (twoFactorLostAccess) {
            setTwoFactorLostAccess(false);
            methods.setValue("backupCode", "");
          } else {
            setTwoFactorRequired(false);
            methods.setValue("totpCode", "");
          }
          setErrorMessage(null);
        }}
        StartIcon="arrow-left"
        color="minimal">
        {t("go_back")}
      </Button>
      {!twoFactorLostAccess ? (
        <Button
          onClick={() => {
            setTwoFactorLostAccess(true);
            setErrorMessage(null);
            methods.setValue("totpCode", "");
          }}
          StartIcon="lock"
          color="minimal">
          {t("lost_access")}
        </Button>
      ) : null}
    </>
  );

  const ExternalTotpFooter = (
    <Button
      onClick={() => {
        window.location.replace("/");
      }}
      color="minimal">
      {t("cancel")}
    </Button>
  );

  const onSubmit = async (values: LoginValues) => {
    setErrorMessage(null);
    telemetry.event(telemetryEventTypes.login, collectPageParameters());
    const res = await signIn<"credentials">("credentials", {
      ...values,
      callbackUrl,
      redirect: false,
    });
    if (!res) setErrorMessage(errorMessages[ErrorCode.InternalServerError]);
    else if (!res.error) {
      setLastUsed("credentials");
      router.push(callbackUrl);
    } else if (res.error === ErrorCode.SecondFactorRequired) setTwoFactorRequired(true);
    else if (res.error === ErrorCode.IncorrectBackupCode) setErrorMessage(t("incorrect_backup_code"));
    else if (res.error === ErrorCode.MissingBackupCodes) setErrorMessage(t("missing_backup_codes"));
    else setErrorMessage(errorMessages[res.error] || t("something_went_wrong"));
  };

  const { data, isPending, error } = trpc.viewer.public.ssoConnections.useQuery();

  useEffect(
    function refactorMeWithoutEffect() {
      if (error) {
        setErrorMessage(error.message);
      }
    },
    [error]
  );

  const [inWebView, setInWebView] = useState(false);

  useEffect(() => {
    setInWebView(isWebView());
  }, []);

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
            {/* Left Column - Login Form */}
            <div className="flex flex-col justify-center p-6 lg:p-12">
              <div className="fade-in-up center mb-8">
                <h1 className="text-default mb-2 text-center text-2xl font-bold md:text-left">
                  {twoFactorRequired ? t("2fa_code") : t("welcome_back")}
                </h1>
                {!twoFactorRequired && (
                  <p className="text-emphasis text-center font-medium sm:text-center md:text-left">
                    {t("sign_in_account")}
                  </p>
                )}
              </div>

              <FormProvider {...methods}>
                {/* Social Login Buttons - INSIDE FormProvider */}
                {!twoFactorRequired && (
                  <>
                    <div className="mb-4 space-y-2">
                      {inWebView ? (
                        <WebViewBlocker />
                      ) : (
                        isGoogleLoginEnabled && (
                          <div className="fade-in-up relative" style={{ animationDelay: "100ms" }}>
                            <Button
                              color="secondary"
                              disabled={formState.isSubmitting}
                              CustomStartIcon={<GoogleIcon />}
                              className="google-btn-premium w-full justify-center rounded-lg border border-gray-300 px-4 py-3 font-semibold shadow-sm hover:border-gray-400 hover:bg-gray-50"
                              data-testid="google"
                              onClick={async (e) => {
                                e.preventDefault();
                                setLastUsed("google");
                                await signIn("google", {
                                  callbackUrl,
                                });
                              }}>
                              <span className="sm:hidden">{t("sign_in")}</span>
                              <span className="hidden sm:inline">{t("signin_with_google")}</span>
                            </Button>
                            {lastUsed === "google" && (
                              <span className="absolute -top-3 right-2 z-10 rounded-full border border-gray-200 bg-default px-2.5 py-1 text-xs font-semibold text-default">
                                ⭐ Last Used
                              </span>
                            )}
                          </div>
                        )
                      )}
                    </div>

                    {/* Divider */}
                    {isGoogleLoginEnabled && (
                      <div className="fade-in-up my-2" style={{ animationDelay: "200ms" }}>
                        <div className="relative flex items-center">
                          <div className="flex-grow border-t border-gray-200" />
                          <span className="px-4 text-sm font-medium text-gray-500">{t("or")}</span>
                          <div className="flex-grow border-t border-gray-200" />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Login Form - Native form element */}
                <form
                  onSubmit={methods.handleSubmit(onSubmit)}
                  noValidate
                  className="fade-in-up"
                  style={{ animationDelay: "300ms" }}>
                  <div>
                    <input
                      defaultValue={csrfToken || undefined}
                      type="hidden"
                      hidden
                      {...register("csrfToken")}
                    />
                  </div>

                  <div className="space-y-6">
                    <div className={classNames("space-y-6", { hidden: twoFactorRequired })}>
                      <EmailField
                        id="email"
                        size="lg"
                        noLabel={true}
                        variant="floating"
                        prefixIcon="mail"
                        defaultValue={totpEmail || (searchParams?.get("email") as string)}
                        placeholder="Email Id"
                        required
                        autoComplete="email"
                        {...register("email")}
                      />
                      <PasswordField
                        id="password"
                        size="lg"
                        variant="floating"
                        prefixIcon="lock"
                        autoComplete="current-password"
                        required={!totpEmail}
                        {...register("password")}
                      />
                      <div className="flex justify-end pt-1">
                        <Link
                          href="/auth/forgot-password"
                          tabIndex={-1}
                          className="dark:text-emphasis text-sm font-semibold text-[#007ee5] hover:text-[#006ac1] hover:underline">
                          {t("forgot_password")}
                        </Link>
                      </div>
                    </div>

                    {/* Two Factor Authentication */}
                    {twoFactorRequired && !twoFactorLostAccess && <TwoFactor center />}
                    {twoFactorRequired && twoFactorLostAccess && <BackupCode center />}

                    {/* Error Message */}
                    {errorMessage && <Alert severity="error" title={errorMessage} />}

                    {/* Sign In Button */}

                    <div className="fade-in-up relative" style={{ animationDelay: "100ms" }}>
                      <Button
                        type="submit"
                        disabled={formState.isSubmitting}
                        className="w-full justify-center rounded-lg py-3 font-semibold "
                        data-testid="submit">
                        <span>{twoFactorRequired ? t("submit") : t("sign_in")}</span>
                      </Button>
                      {lastUsed === "credentials" && (
                        <span className="bg-default absolute right-2 -top-3 z-10 rounded-full border border-gray-200 px-2.5 py-1 text-xs font-semibold text-default">
                          ⭐ Last Used
                        </span>
                      )}
                    </div>
                  </div>
                </form>

                {/* Footer */}
                {!twoFactorRequired && process.env.NEXT_PUBLIC_DISABLE_SIGNUP !== "true" && (
                  <div className="fade-in-up mt-6 text-center" style={{ animationDelay: "400ms" }}>
                    <p className="text-emphasis font-medium">
                      {t("dont_have_an_account")}{" "}
                      <Link
                        href={`${WEBAPP_URL}/signup`}
                        className="font-semibold text-[#007ee5] hover:text-[#006ac1] hover:underline">
                        {t("sign_up")}
                      </Link>
                    </p>
                  </div>
                )}

                {/* Two Factor Footer */}
                {twoFactorRequired && (
                  <div className="mt-6 flex flex-col space-y-3">
                    {!totpEmail ? TwoFactorFooter : ExternalTotpFooter}
                  </div>
                )}
              </FormProvider>
            </div>

            {/* Right Column - Image */}
          </div>
        </div>

        <div className="mt-8">
          <div className="mb-4 flex items-center justify-center">
            <Logo small icon />
          </div>
        </div>
        <AddToHomescreen />
      </div>
    </>
  );
}
