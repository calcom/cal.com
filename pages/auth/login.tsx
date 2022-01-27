import { GetServerSidePropsContext } from "next";
import { getCsrfToken, signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

import { ErrorCode, getSession } from "@lib/auth";
import { WEBSITE_URL } from "@lib/config/constants";
import { useLocale } from "@lib/hooks/useLocale";
import { isSAMLLoginEnabled, hostedCal, samlTenantID, samlProductID } from "@lib/saml";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";
import { trpc } from "@lib/trpc";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import AddToHomescreen from "@components/AddToHomescreen";
import { EmailField, PasswordField, TextField } from "@components/form/fields";
import AuthContainer from "@components/ui/AuthContainer";
import Button from "@components/ui/Button";

import { IS_GOOGLE_LOGIN_ENABLED } from "@server/lib/constants";
import { ssrInit } from "@server/lib/ssr";

export default function Login({
  csrfToken,
  isGoogleLoginEnabled,
  isSAMLLoginEnabled,
  hostedCal,
  samlTenantID,
  samlProductID,
}: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secondFactorRequired, setSecondFactorRequired] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const errorMessages: { [key: string]: string } = {
    [ErrorCode.SecondFactorRequired]: t("2fa_enabled_instructions"),
    [ErrorCode.IncorrectPassword]: `${t("incorrect_password")} ${t("please_try_again")}`,
    [ErrorCode.UserNotFound]: t("no_account_exists"),
    [ErrorCode.IncorrectTwoFactorCode]: `${t("incorrect_2fa_code")} ${t("please_try_again")}`,
    [ErrorCode.InternalServerError]: `${t("something_went_wrong")} ${t("please_try_again_and_contact_us")}`,
    [ErrorCode.ThirdPartyIdentityProviderEnabled]: t("account_created_with_identity_provider"),
  };

  const telemetry = useTelemetry();

  const callbackUrl = typeof router.query?.callbackUrl === "string" ? router.query.callbackUrl : "/";

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await signIn<"credentials">("credentials", {
        redirect: false,
        email,
        password,
        totpCode: code,
        callbackUrl,
      });
      if (!response) {
        throw new Error("Received empty response from next auth");
      }

      if (!response.error) {
        // we're logged in! let's do a hard refresh to the desired url
        window.location.replace(callbackUrl);
        return;
      }

      if (response.error === ErrorCode.SecondFactorRequired) {
        setSecondFactorRequired(true);
        setErrorMessage(errorMessages[ErrorCode.SecondFactorRequired]);
      } else {
        setErrorMessage(errorMessages[response.error] || t("something_went_wrong"));
      }
      setIsSubmitting(false);
    } catch (e) {
      setErrorMessage(t("something_went_wrong"));
      setIsSubmitting(false);
    }
  }

  const mutation = trpc.useMutation("viewer.samlTenantProduct", {
    onSuccess: (data) => {
      signIn("saml", {}, { tenant: data.tenant, product: data.product });
    },
    onError: (err) => {
      setErrorMessage(err.message);
    },
  });

  return (
    <>
      <AuthContainer
        title={t("login")}
        description={t("login")}
        loading={isSubmitting}
        showLogo
        heading={t("sign_in_account")}
        footerText={
          <>
            {t("dont_have_an_account")} {/* replace this with your account creation flow */}
            <a href={`${WEBSITE_URL}/signup`} className="font-medium text-neutral-900">
              {t("create_an_account")}
            </a>
          </>
        }>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <input name="csrfToken" type="hidden" defaultValue={csrfToken || undefined} hidden />
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
              {t("email_address")}
            </label>
            <div className="mt-1">
              <EmailField
                id="email"
                name="email"
                placeholder="john.doe@example.com"
                required
                value={email}
                onInput={(e) => setEmail(e.currentTarget.value)}
              />
            </div>
          </div>

          <div className="relative">
            <div className="absolute right-0 -top-[2px]">
              <Link href="/auth/forgot-password">
                <a tabIndex={-1} className="text-sm font-medium text-primary-600">
                  {t("forgot")}
                </a>
              </Link>
            </div>
            <PasswordField
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onInput={(e) => setPassword(e.currentTarget.value)}
            />
          </div>

          {secondFactorRequired && (
            <TextField
              className="mt-1"
              id="totpCode"
              name={t("2fa_code")}
              type="text"
              maxLength={6}
              minLength={6}
              inputMode="numeric"
              value={code}
              onInput={(e) => setCode(e.currentTarget.value)}
            />
          )}

          <div className="flex space-y-2">
            <Button className="flex justify-center w-full" type="submit" disabled={isSubmitting}>
              {t("sign_in")}
            </Button>
          </div>

          {errorMessage && <p className="mt-1 text-sm text-red-700">{errorMessage}</p>}
        </form>
        {isGoogleLoginEnabled && (
          <div style={{ marginTop: "12px" }}>
            <Button
              color="secondary"
              className="flex justify-center w-full"
              data-testid={"google"}
              onClick={async (event) => {
                event.preventDefault();

                // track Google logins. Without personal data/payload
                telemetry.withJitsu((jitsu) =>
                  jitsu.track(telemetryEventTypes.googleLogin, collectPageParameters())
                );

                await signIn("google");
              }}>
              {" "}
              {t("signin_with_google")}
            </Button>
          </div>
        )}
        {isSAMLLoginEnabled && (
          <div style={{ marginTop: "12px" }}>
            <Button
              color="secondary"
              data-testid={"saml"}
              className="flex justify-center w-full"
              onClick={async (event) => {
                event.preventDefault();

                // track SAML logins. Without personal data/payload
                telemetry.withJitsu((jitsu) =>
                  jitsu.track(telemetryEventTypes.samlLogin, collectPageParameters())
                );

                if (!hostedCal) {
                  await signIn("saml", {}, { tenant: samlTenantID, product: samlProductID });
                } else {
                  if (email.length === 0) {
                    setErrorMessage(t("saml_email_required"));
                    return;
                  }

                  // hosted solution, fetch tenant and product from the backend
                  mutation.mutate({
                    email,
                  });
                }
              }}>
              {t("signin_with_saml")}
            </Button>
          </div>
        )}
      </AuthContainer>

      <AddToHomescreen />
    </>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { req } = context;
  const session = await getSession({ req });
  const ssr = await ssrInit(context);

  if (session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return {
    props: {
      csrfToken: await getCsrfToken(context),
      trpcState: ssr.dehydrate(),
      isGoogleLoginEnabled: IS_GOOGLE_LOGIN_ENABLED,
      isSAMLLoginEnabled,
      hostedCal,
      samlTenantID,
      samlProductID,
    },
  };
}
