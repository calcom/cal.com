import classNames from "classnames";
import { GetServerSidePropsContext } from "next";
import { getCsrfToken, signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import prisma from "@calcom/prisma";
import { Alert } from "@calcom/ui/Alert";
import Button from "@calcom/ui/Button";
import { Icon } from "@calcom/ui/Icon";
import { EmailField, Form, PasswordField } from "@calcom/ui/form/fields";

import { ErrorCode, getSession } from "@lib/auth";
import { WEBAPP_URL, WEBSITE_URL } from "@lib/config/constants";
import { hostedCal, isSAMLLoginEnabled, samlProductID, samlTenantID } from "@lib/saml";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import AddToHomescreen from "@components/AddToHomescreen";
import SAMLLogin from "@components/auth/SAMLLogin";
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
  hostedCal,
  samlTenantID,
  samlProductID,
}: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();
  const router = useRouter();
  const form = useForm<LoginValues>();
  const { formState } = form;
  const { isSubmitting } = formState;

  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const errorMessages: { [key: string]: string } = {
    // [ErrorCode.SecondFactorRequired]: t("2fa_enabled_instructions"),
    [ErrorCode.IncorrectPassword]: `${t("incorrect_password")} ${t("please_try_again")}`,
    [ErrorCode.UserNotFound]: t("no_account_exists"),
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
    <span>
      {t("dont_have_an_account")}{" "}
      <a href={`${WEBSITE_URL}/signup`} className="font-medium text-neutral-900">
        {t("create_an_account")}
      </a>
    </span>
  );

  const TwoFactorFooter = (
    <Button
      onClick={() => {
        setTwoFactorRequired(false);
        form.setValue("totpCode", "");
      }}
      StartIcon={Icon.FiArrowLeft}
      color="minimal">
      {t("go_back")}
    </Button>
  );

  return (
    <>
      <AuthContainer
        title={t("login")}
        description={t("login")}
        showLogo
        heading={twoFactorRequired ? t("2fa_code") : t("sign_in_account")}
        footerText={twoFactorRequired ? TwoFactorFooter : LoginFooter}>
        <Form
          form={form}
          className="space-y-6"
          handleSubmit={async (values) => {
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
          }}
          data-testid="login-form">
          <div>
            <input
              defaultValue={csrfToken || undefined}
              type="hidden"
              hidden
              {...form.register("csrfToken")}
            />
          </div>
          <div className={classNames("space-y-6", { hidden: twoFactorRequired })}>
            <EmailField
              id="email"
              label={t("email_address")}
              defaultValue={router.query.email as string}
              placeholder="john.doe@example.com"
              required
              {...form.register("email")}
            />
            <div className="relative">
              <div className="absolute right-0 -top-[2px]">
                <Link href="/auth/forgot-password">
                  <a tabIndex={-1} className="text-primary-600 text-sm font-medium">
                    {t("forgot")}
                  </a>
                </Link>
              </div>
              <PasswordField
                id="password"
                type="password"
                autoComplete="current-password"
                required
                {...form.register("password")}
              />
            </div>
          </div>

          {twoFactorRequired && <TwoFactor />}

          {errorMessage && <Alert severity="error" title={errorMessage} />}
          <div className="flex space-y-2">
            <Button className="flex w-full justify-center" type="submit" disabled={isSubmitting}>
              {twoFactorRequired ? t("submit") : t("sign_in")}
            </Button>
          </div>
        </Form>

        {!twoFactorRequired && (
          <>
            {isGoogleLoginEnabled && (
              <div className="mt-5">
                <Button
                  color="secondary"
                  className="flex w-full justify-center"
                  data-testid="google"
                  onClick={async (e) => {
                    e.preventDefault();
                    // track Google logins. Without personal data/payload
                    telemetry.event(telemetryEventTypes.googleLogin, collectPageParameters());
                    await signIn("google");
                  }}>
                  {t("signin_with_google")}
                </Button>
              </div>
            )}
            {isSAMLLoginEnabled && (
              <SAMLLogin
                email={form.getValues("email")}
                samlTenantID={samlTenantID}
                samlProductID={samlProductID}
                hostedCal={hostedCal}
                setErrorMessage={setErrorMessage}
              />
            )}
          </>
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
      hostedCal,
      samlTenantID,
      samlProductID,
    },
  };
}
