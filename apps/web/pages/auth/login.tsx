import { GetServerSidePropsContext } from "next";
import { getCsrfToken, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import Button from "@calcom/ui/Button";
import { Icon } from "@calcom/ui/Icon";
import prisma from "@calcom/web/lib/prisma";

import { ErrorCode, getSession } from "@lib/auth";
import { WEBAPP_URL } from "@lib/config/constants";
import { hostedCal, isSAMLLoginEnabled, samlProductID, samlTenantID } from "@lib/saml";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import AddToHomescreen from "@components/AddToHomescreen";
import SAMLLogin from "@components/auth/SAMLLogin";
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
    [ErrorCode.RateLimitExceeded]: t("rate_limit_exceeded"),
    [ErrorCode.SecondFactorRequired]: t("2fa_enabled_instructions"),
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
        footerText={twoFactorRequired ? TwoFactorFooter : null}>
        {!twoFactorRequired && (
          <>
            {isGoogleLoginEnabled && (
              <div className="mt-0">
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
