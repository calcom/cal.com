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

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import AddToHomescreen from "@components/AddToHomescreen";
import BackupCode from "@components/auth/BackupCode";
import TwoFactor from "@components/auth/TwoFactor";

import type { getServerSideProps } from "@server/lib/auth/login/getServerSideProps";

interface LoginValues {
  email: string;
  password: string;
  totpCode: string;
  backupCode: string;
  csrfToken: string;
}

const GoogleIcon = () => (
  <img className="text-subtle mr-2 h-4 w-4" src="/google-icon-colored.svg" alt="Continue with Google Icon" />
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
    // Passthrough other fields like totpCode
    .passthrough();
  const methods = useForm<LoginValues>({ resolver: zodResolver(formSchema) });
  const { register, formState } = methods;
  const [twoFactorRequired, setTwoFactorRequired] = useState(!!totpEmail || false);
  const [twoFactorLostAccess, setTwoFactorLostAccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUsed, setLastUsed] = useLastUsed();

  const errorMessages: { [key: string]: string } = {
    // [ErrorCode.SecondFactorRequired]: t("2fa_enabled_instructions"),
    // Don't leak information about whether an email is registered or not
    [ErrorCode.IncorrectEmailPassword]: t("incorrect_email_password"),
    [ErrorCode.IncorrectTwoFactorCode]: `${t("incorrect_2fa_code")} ${t("please_try_again")}`,
    [ErrorCode.InternalServerError]: `${t("something_went_wrong")} ${t("please_try_again_and_contact_us")}`,
    [ErrorCode.ThirdPartyIdentityProviderEnabled]: t("account_created_with_identity_provider"),
  };

  const telemetry = useTelemetry();

  let callbackUrl = searchParams?.get("callbackUrl") || "/home";

  if (/"\//.test(callbackUrl)) callbackUrl = callbackUrl.substring(1);

  // If not absolute URL, make it absolute
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
    // we're logged in! let's do a hard refresh to the desired url
    else if (!res.error) {
      setLastUsed("credentials");
      router.push(callbackUrl);
    } else if (res.error === ErrorCode.SecondFactorRequired) setTwoFactorRequired(true);
    else if (res.error === ErrorCode.IncorrectBackupCode) setErrorMessage(t("incorrect_backup_code"));
    else if (res.error === ErrorCode.MissingBackupCodes) setErrorMessage(t("missing_backup_codes"));
    // fallback if error not found
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

  return (
    <div className="bg-default flex min-h-screen flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="border-default w-full max-w-lg rounded-2xl border p-8 shadow-xl">
        {/* Welcome Text */}
        <div className="mb-8 text-center">
          <h1 className="text-emphasis text-3xl font-bold">
            {twoFactorRequired ? t("2fa_code") : t("welcome_back")}
          </h1>
          {!twoFactorRequired && <p className="text-subtle">{t("sign_in_account")}</p>}
        </div>

        <FormProvider {...methods}>
          {!twoFactorRequired && (
            <>
              <div className="mb-4 space-y-2">
                {isGoogleLoginEnabled && (
                  <Button
                    color="secondary"
                    className="text-subtle bg-primary relative w-full justify-center rounded-md"
                    disabled={formState.isSubmitting}
                    data-testid="google"
                    CustomStartIcon={<GoogleIcon />}
                    onClick={async (e) => {
                      e.preventDefault();
                      setLastUsed("google");
                      await signIn("google", {
                        callbackUrl,
                      });
                    }}>
                    <span className="sm:hidden">{t("sign_in")}</span>
                    <span className="hidden sm:inline">{t("signin_with_google")}</span>
                    {lastUsed === "google" && <LastUsed />}
                  </Button>
                )}
              </div>

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
            </>
          )}

          {/* Login Form */}
          <form onSubmit={methods.handleSubmit(onSubmit)} noValidate data-testid="login-form">
            <div>
              <input defaultValue={csrfToken || undefined} type="hidden" hidden {...register("csrfToken")} />
            </div>
            <div className="space-y-6">
              <div className={classNames("space-y-6", { hidden: twoFactorRequired })}>
                <EmailField
                  id="email"
                  label={t("email_address")}
                  defaultValue={totpEmail || (searchParams?.get("email") as string)}
                  placeholder="john@example.com"
                  required
                  autoComplete="email"
                  {...register("email")}
                />
                <PasswordField
                  id="password"
                  autoComplete="current-password"
                  required={!totpEmail}
                  {...register("password")}
                />
                <Link href="/auth/forgot-password" tabIndex={-1} className="text-sm">
                  {t("forgot_password")}
                </Link>
              </div>

              {/* Two Factor Authentication */}
              {twoFactorRequired ? !twoFactorLostAccess ? <TwoFactor center /> : <BackupCode center /> : null}

              {/* Error Message */}
              {errorMessage && <Alert severity="error" title={errorMessage} />}

              {/* Sign In Button */}
              <Button
                type="submit"
                disabled={formState.isSubmitting}
                className="bg-active border-active dark:border-default w-full justify-center py-3 dark:bg-gray-200"
                data-testid="submit">
                <span>{twoFactorRequired ? t("submit") : t("sign_in")}</span>
                {lastUsed === "credentials" && !twoFactorRequired && <LastUsed className="text-brand" />}
              </Button>
            </div>
          </form>

          {/* Footer */}
          {!twoFactorRequired && process.env.NEXT_PUBLIC_DISABLE_SIGNUP !== "true" && (
            <div className="mt-2 text-center">
              <p className="text-subtle text-sm">
                {t("dont_have_an_account")}{" "}
                <Link
                  href={`${WEBAPP_URL}/signup`}
                  className="text-active dark:text-default font-medium hover:underline">
                  {t("sign_up")}
                </Link>
              </p>
            </div>
          )}

          {/* Two Factor Footer */}
          {twoFactorRequired && (
            <div className="flex flex-col space-y-3">{!totpEmail ? TwoFactorFooter : ExternalTotpFooter}</div>
          )}
        </FormProvider>
      </div>
      <div className="mt-8">
        <div className="mb-8 flex justify-center">
          <Logo small icon />
        </div>
      </div>
      <AddToHomescreen />
    </div>
  );
}
