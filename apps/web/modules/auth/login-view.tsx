"use client";

import { Button } from "@calid/features/ui/components/button";
import { EmailField, PasswordField } from "@calid/features/ui/components/input/input";
import { zodResolver } from "@hookform/resolvers/zod";
import classNames from "classnames";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { WEBAPP_URL, WEBSITE_URL } from "@calcom/lib/constants";
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

  let callbackUrl = searchParams?.get("callbackUrl") || "";

  if (/"\//.test(callbackUrl)) callbackUrl = callbackUrl.substring(1);

  // If not absolute URL, make it absolute
  if (!/^https?:\/\//.test(callbackUrl)) {
    callbackUrl = `${WEBAPP_URL}/${callbackUrl}`;
  }

  const safeCallbackUrl = getSafeRedirectUrl(callbackUrl);

  callbackUrl = safeCallbackUrl || "";

  const LoginFooter = (
    <Link href={`${WEBSITE_URL}/signup`} className="text-brand-500 font-medium">
      {t("dont_have_an_account")}
    </Link>
  );

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
    <div className="bg-primary flex min-h-screen items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="border-subtle w-full max-w-lg rounded-2xl border p-8 shadow-xl">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-8 flex items-center justify-center space-x-2">
            <span className="text-2xl font-bold text-gray-900">Cal ID</span>
          </div>
        </div>

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
                    className="text-subtle bg-primary w-full justify-center rounded-md"
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
                    <span>{t("signin_with_google")}</span>
                    {lastUsed === "google" && <LastUsed />}
                  </Button>
                )}
              </div>

              {/* Divider */}
              {isGoogleLoginEnabled && (
                <div className="relative mb-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="text-subtle bg-primary px-2 font-medium">
                      {t("or_continue_with_email")}
                    </span>
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
                <Link
                  className="mt-4"
                  href="/auth/forgot-password"
                  tabIndex={-1}
                  className="text-active text-sm hover:underline">
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
                color="primary"
                disabled={formState.isSubmitting}
                className="w-full justify-center py-3">
                <span>{twoFactorRequired ? t("submit") : t("sign_in")}</span>
                {lastUsed === "credentials" && !twoFactorRequired && <LastUsed className="text-default" />}
              </Button>
            </div>
          </form>

          {/* Footer */}
          {!twoFactorRequired && process.env.NEXT_PUBLIC_DISABLE_SIGNUP !== "true" && (
            <div className="mt-2 text-center">
              <p className="text-subtle text-sm">
                {t("dont_have_an_account")}{" "}
                <Link href={`${WEBSITE_URL}/signup`} className="text-active font-medium hover:underline">
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
      <AddToHomescreen />
    </div>
  );
}
