import classNames from "classnames";
import { jwtVerify } from "jose";
import type { GetServerSidePropsContext } from "next";
import { getCsrfToken, signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import type { CSSProperties } from "react";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { FaGoogle } from "react-icons/fa";

import { SAMLLogin } from "@calcom/features/auth/SAMLLogin";
import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { isSAMLLoginEnabled, samlProductID, samlTenantID } from "@calcom/features/ee/sso/lib/saml";
import { WEBAPP_URL, WEBSITE_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import prisma from "@calcom/prisma";
import { Alert, Button, EmailField, PasswordField } from "@calcom/ui";
import { ArrowLeft } from "@calcom/ui/components/icon";

import type { inferSSRProps } from "@lib/types/inferSSRProps";
import type { WithNonceProps } from "@lib/withNonce";
import withNonce from "@lib/withNonce";

import AddToHomescreen from "@components/AddToHomescreen";
import PageWrapper from "@components/PageWrapper";
import TwoFactor from "@components/auth/TwoFactor";
import AuthContainer from "@components/ui/AuthContainer";

import { IS_GOOGLE_LOGIN_ENABLED } from "@server/lib/constants";
import { ssrInit } from "@server/lib/ssr";

interface LoginValues {
  email: string;
  password: string;
  totpCode: string;
  csrfToken: string;
}

export default function Login({
  csrfToken,
  isGoogleLoginEnabled,
  isSAMLLoginEnabled,
  samlTenantID,
  samlProductID,
  totpEmail,
}: inferSSRProps<typeof _getServerSideProps> & WithNonceProps) {
  const { t } = useLocale();
  const router = useRouter();
  const methods = useForm<LoginValues>();

  const { register, formState } = methods;
  const [twoFactorRequired, setTwoFactorRequired] = useState(!!totpEmail || false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const errorMessages: { [key: string]: string } = {
    // [ErrorCode.SecondFactorRequired]: t("2fa_enabled_instructions"),
    // Don't leak information about whether an email is registered or not
    [ErrorCode.IncorrectUsernamePassword]: t("incorrect_username_password"),
    [ErrorCode.IncorrectTwoFactorCode]: `${t("incorrect_2fa_code")} ${t("please_try_again")}`,
    [ErrorCode.InternalServerError]: `${t("something_went_wrong")} ${t("please_try_again_and_contact_us")}`,
    [ErrorCode.ThirdPartyIdentityProviderEnabled]: t("account_created_with_identity_provider"),
  };

  const telemetry = useTelemetry();

  let callbackUrl = typeof router.query?.callbackUrl === "string" ? router.query.callbackUrl : "";

  if (/"\//.test(callbackUrl)) callbackUrl = callbackUrl.substring(1);

  // If not absolute URL, make it absolute
  if (!/^https?:\/\//.test(callbackUrl)) {
    callbackUrl = `${WEBAPP_URL}/${callbackUrl}`;
  }

  const safeCallbackUrl = getSafeRedirectUrl(callbackUrl);

  callbackUrl = safeCallbackUrl || "";

  const LoginFooter = (
    <a href={`${WEBSITE_URL}/signup`} className="text-brand-500 font-medium">
      {t("dont_have_an_account")}
    </a>
  );

  const TwoFactorFooter = (
    <Button
      onClick={() => {
        setTwoFactorRequired(false);
        methods.setValue("totpCode", "");
      }}
      StartIcon={ArrowLeft}
      color="minimal">
      {t("go_back")}
    </Button>
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
    else if (!res.error) router.push(callbackUrl);
    // reveal two factor input if required
    else if (res.error === ErrorCode.SecondFactorRequired) setTwoFactorRequired(true);
    // fallback if error not found
    else setErrorMessage(errorMessages[res.error] || t("something_went_wrong"));
  };

  return (
    <div
      style={
        {
          "--cal-brand": "#111827",
          "--cal-brand-emphasis": "#101010",
          "--cal-brand-text": "white",
          "--cal-brand-subtle": "#9CA3AF",
        } as CSSProperties
      }>
      <AuthContainer
        title={t("login")}
        description={t("login")}
        showLogo
        heading={twoFactorRequired ? t("2fa_code") : t("welcome_back")}
        footerText={
          twoFactorRequired
            ? !totpEmail
              ? TwoFactorFooter
              : ExternalTotpFooter
            : process.env.NEXT_PUBLIC_DISABLE_SIGNUP !== "true"
            ? LoginFooter
            : null
        }>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} data-testid="login-form">
            <div>
              <input defaultValue={csrfToken || undefined} type="hidden" hidden {...register("csrfToken")} />
            </div>
            <div className="space-y-6">
              <div className={classNames("space-y-6", { hidden: twoFactorRequired })}>
                <EmailField
                  id="email"
                  label={t("email_address")}
                  defaultValue={totpEmail || (router.query.email as string)}
                  placeholder="john.doe@example.com"
                  required
                  {...register("email")}
                />
                <div className="relative">
                  <PasswordField
                    id="password"
                    autoComplete="off"
                    required={!totpEmail}
                    className="mb-0"
                    {...register("password")}
                  />
                  <div className="absolute -top-[2px] ltr:right-0 rtl:left-0">
                    <Link
                      href="/auth/forgot-password"
                      tabIndex={-1}
                      className="text-default text-sm font-medium">
                      {t("forgot")}
                    </Link>
                  </div>
                </div>
              </div>

              {twoFactorRequired && <TwoFactor center />}

              {errorMessage && <Alert severity="error" title={errorMessage} />}
              <Button
                type="submit"
                color="primary"
                disabled={formState.isSubmitting}
                className="w-full justify-center">
                {twoFactorRequired ? t("submit") : t("sign_in")}
              </Button>
            </div>
          </form>
          {!twoFactorRequired && (
            <>
              {(isGoogleLoginEnabled || isSAMLLoginEnabled) && <hr className="border-subtle my-8" />}
              <div className="space-y-3">
                {isGoogleLoginEnabled && (
                  <Button
                    color="secondary"
                    className="w-full justify-center"
                    data-testid="google"
                    StartIcon={FaGoogle}
                    onClick={async (e) => {
                      e.preventDefault();
                      await signIn("google");
                    }}>
                    {t("signin_with_google")}
                  </Button>
                )}
                {isSAMLLoginEnabled && (
                  <SAMLLogin
                    samlTenantID={samlTenantID}
                    samlProductID={samlProductID}
                    setErrorMessage={setErrorMessage}
                  />
                )}
              </div>
            </>
          )}
        </FormProvider>
      </AuthContainer>
      <AddToHomescreen />
    </div>
  );
}

// TODO: Once we understand how to retrieve prop types automatically from getServerSideProps, remove this temporary variable
const _getServerSideProps = async function getServerSideProps(context: GetServerSidePropsContext) {
  const { req, res } = context;

  const session = await getServerSession({ req, res });
  const ssr = await ssrInit(context);

  const verifyJwt = (jwt: string) => {
    const secret = new TextEncoder().encode(process.env.CALENDSO_ENCRYPTION_KEY);

    return jwtVerify(jwt, secret, {
      issuer: WEBSITE_URL,
      audience: `${WEBSITE_URL}/auth/login`,
      algorithms: ["HS256"],
    });
  };

  let totpEmail = null;
  if (context.query.totp) {
    try {
      const decryptedJwt = await verifyJwt(context.query.totp as string);
      if (decryptedJwt.payload) {
        totpEmail = decryptedJwt.payload.email as string;
      } else {
        return {
          redirect: {
            destination: "/auth/error?error=JWT%20Invalid%20Payload",
            permanent: false,
          },
        };
      }
    } catch (e) {
      return {
        redirect: {
          destination: "/auth/error?error=Invalid%20JWT%3A%20Please%20try%20again",
          permanent: false,
        },
      };
    }
  }

  if (session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  const userCount = await prisma.user.count();
  if (userCount === 0) {
    // Proceed to new onboarding to create first admin user
    return {
      redirect: {
        destination: "/auth/setup",
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
      samlTenantID,
      samlProductID,
      totpEmail,
    },
  };
};

Login.isThemeSupported = false;
Login.PageWrapper = PageWrapper;

export const getServerSideProps = withNonce(_getServerSideProps);
