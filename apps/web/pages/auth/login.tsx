import { GetServerSidePropsContext } from "next";
import { getCsrfToken, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { FaGoogle } from "react-icons/fa";

import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import prisma from "@calcom/prisma";
import { Icon } from "@calcom/ui";
import { Alert } from "@calcom/ui/Alert";
import { Button } from "@calcom/ui/components";
import { EmailField, PasswordField } from "@calcom/ui/components/form";
import SAMLLogin from "@calcom/ui/v2/modules/auth/SAMLLogin";

import { getSession } from "@lib/auth";
import { WEBAPP_URL } from "@lib/config/constants";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import AddToHomescreen from "@components/AddToHomescreen";
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

export default function Login({ isGoogleLoginEnabled }: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();
  const router = useRouter();
  const methods = useForm<LoginValues>();

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
        methods.setValue("totpCode", "");
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
        heading={t("welcome_back")}
        footerText={null}>
        <div className="mt-0 text-center">
          {isGoogleLoginEnabled && (
            <Button
              color="secondary"
              className="w-full justify-center"
              data-testid="google"
              StartIcon={FaGoogle}
              onClick={async (e) => {
                e.preventDefault();
                // track Google logins. Without personal data/payload
                telemetry.event(telemetryEventTypes.googleLogin, collectPageParameters());
                await signIn("google");
              }}>
              {t("signin_with_google")}
            </Button>
          )}
        </div>
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
    },
  };
}
