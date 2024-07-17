"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { SAMLLogin } from "@calcom/features/auth/SAMLLogin";
import { HOSTED_CAL_FEATURES, WEBAPP_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui";

import type { inferSSRProps } from "@lib/types/inferSSRProps";
import type { WithNonceProps } from "@lib/withNonce";

import AddToHomescreen from "@components/AddToHomescreen";
import PageWrapper from "@components/PageWrapper";
import AuthContainer from "@components/ui/AuthContainer";

import { getServerSideProps } from "@server/lib/auth/login/getServerSideProps";

interface LoginValues {
  email: string;
  password: string;
  totpCode: string;
  backupCode: string;
  csrfToken: string;
}

const GoogleIcon = () => (
  <img className="text-subtle mr-2 h-4 w-4 dark:invert" src="/google-icon.svg" alt="" />
);
export default function Login({
  csrfToken,
  isGoogleLoginEnabled,
  isSAMLLoginEnabled,
  samlTenantID,
  samlProductID,
  totpEmail,
}: // eslint-disable-next-line @typescript-eslint/ban-types
inferSSRProps<typeof getServerSideProps> & WithNonceProps<{}>) {
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();
  const router = useRouter();
  const formSchema = z
    .object({
      email: z
        .string()
        .min(1, `${t("error_required_field")}`)
        .email(`${t("enter_valid_email")}`),
      ...(!!totpEmail ? {} : { password: z.string().min(1, `${t("error_required_field")}`) }),
    })
    // Passthrough other fields like totpCode
    .passthrough();
  const methods = useForm<LoginValues>({ resolver: zodResolver(formSchema) });
  const { register, formState } = methods;
  const [twoFactorRequired, setTwoFactorRequired] = useState(!!totpEmail || false);
  const [twoFactorLostAccess, setTwoFactorLostAccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  let callbackUrl = searchParams?.get("callbackUrl") || "";

  if (/"\//.test(callbackUrl)) callbackUrl = callbackUrl.substring(1);

  // If not absolute URL, make it absolute
  if (!/^https?:\/\//.test(callbackUrl)) {
    callbackUrl = `${WEBAPP_URL}/${callbackUrl}`;
  }

  const safeCallbackUrl = getSafeRedirectUrl(callbackUrl);

  callbackUrl = safeCallbackUrl || "";

  const { data, isPending, error } = trpc.viewer.public.ssoConnections.useQuery();

  useEffect(
    function refactorMeWithoutEffect() {
      if (error) {
        setErrorMessage(error.message);
      }
    },
    [error]
  );

  const displaySSOLogin = HOSTED_CAL_FEATURES
    ? true
    : isSAMLLoginEnabled && !isPending && data?.connectionExists;

  return (
    <div className="dark:bg-brand dark:text-brand-contrast text-emphasis min-h-screen [--cal-brand-emphasis:#101010] [--cal-brand-subtle:#9CA3AF] [--cal-brand-text:white] [--cal-brand:#111827] dark:[--cal-brand-emphasis:#e1e1e1] dark:[--cal-brand-text:black] dark:[--cal-brand:white]">
      <AuthContainer
        title={t("login")}
        description={t("login")}
        showLogo
        heading={twoFactorRequired ? t("2fa_code") : t("welcome_back")}
        footerText={null}>
        <FormProvider {...methods}>
          {!twoFactorRequired && (
            <>
              <div className="space-y-3">
                {isGoogleLoginEnabled && (
                  <Button
                    color="secondary"
                    className="w-full justify-center"
                    disabled={formState.isSubmitting}
                    data-testid="google"
                    CustomStartIcon={<GoogleIcon />}
                    onClick={async (e) => {
                      e.preventDefault();
                      await signIn(
                        "google",
                        {
                          callbackUrl,
                        },
                        { prompt: "login" }
                      );
                    }}>
                    {t("signin_with_google")}
                  </Button>
                )}
                {displaySSOLogin && (
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

export { getServerSideProps };

Login.PageWrapper = PageWrapper;
