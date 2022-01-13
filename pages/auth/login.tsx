import { GetServerSidePropsContext } from "next";
import { getCsrfToken, signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

import { ErrorCode, getSession } from "@lib/auth";
import { WEBSITE_URL } from "@lib/config/constants";
import { useLocale } from "@lib/hooks/useLocale";
import { isSAMLLoginEnabled, hostedCal, samlTenantID, samlProductID } from "@lib/saml";
import { trpc } from "@lib/trpc";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import AddToHomescreen from "@components/AddToHomescreen";
import Loader from "@components/Loader";
import { EmailInput } from "@components/form/fields";
import { HeadSeo } from "@components/seo/head-seo";

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
    <div className="flex flex-col justify-center min-h-screen py-12 bg-neutral-50 sm:px-6 lg:px-8">
      <HeadSeo title={t("login")} description={t("login")} />

      {isSubmitting && (
        <div className="absolute z-50 flex items-center w-full h-screen bg-gray-50">
          <Loader />
        </div>
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <img className="h-6 mx-auto" src="/calendso-logo-white-word.svg" alt="Cal.com Logo" />
        <h2 className="mt-6 text-3xl font-bold text-center font-cal text-neutral-900">
          {t("sign_in_account")}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="px-4 py-8 mx-2 bg-white border rounded-sm sm:px-10 border-neutral-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <input name="csrfToken" type="hidden" defaultValue={csrfToken || undefined} hidden />
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                {t("email_address")}
              </label>
              <div className="mt-1">
                <EmailInput
                  id="email"
                  name="email"
                  required
                  value={email}
                  onInput={(e) => setEmail(e.currentTarget.value)}
                  className="block w-full px-3 py-2 placeholder-gray-400 border rounded-sm shadow-sm appearance-none border-neutral-300 focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex">
                <div className="w-1/2">
                  <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                    {t("password")}
                  </label>
                </div>
                <div className="w-1/2 text-right">
                  <Link href="/auth/forgot-password">
                    <a tabIndex={-1} className="text-sm font-medium text-primary-600">
                      {t("forgot")}
                    </a>
                  </Link>
                </div>
              </div>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                  className="block w-full px-3 py-2 placeholder-gray-400 border rounded-sm shadow-sm appearance-none border-neutral-300 focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 sm:text-sm"
                />
              </div>
            </div>

            {secondFactorRequired && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                  {t("2fa_code")}
                </label>
                <div className="mt-1">
                  <input
                    id="totpCode"
                    name="totpCode"
                    type="text"
                    maxLength={6}
                    minLength={6}
                    inputMode="numeric"
                    value={code}
                    onInput={(e) => setCode(e.currentTarget.value)}
                    className="block w-full px-3 py-2 placeholder-gray-400 border rounded-sm shadow-sm appearance-none border-neutral-300 focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 sm:text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white border border-transparent rounded-sm shadow-sm bg-neutral-900 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
                {t("sign_in")}
              </button>
            </div>

            {errorMessage && <p className="mt-1 text-sm text-red-700">{errorMessage}</p>}
          </form>
          {isGoogleLoginEnabled && (
            <div style={{ marginTop: "12px" }}>
              <button
                data-testid={"google"}
                onClick={async () => await signIn("google")}
                className="flex justify-center w-full px-4 py-2 text-sm font-medium text-black border border-transparent rounded-sm shadow-sm bg-secondary-50 hover:bg-secondary-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
                {t("signin_with_google")}
              </button>
            </div>
          )}
          {isSAMLLoginEnabled && (
            <div style={{ marginTop: "12px" }}>
              <button
                data-testid={"saml"}
                onClick={async (event) => {
                  event.preventDefault();

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
                }}
                className="flex justify-center w-full px-4 py-2 text-sm font-medium text-black border border-transparent rounded-sm shadow-sm bg-secondary-50 hover:bg-secondary-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
                {t("signin_with_saml")}
              </button>
            </div>
          )}
        </div>
        <div className="mt-4 text-sm text-center text-neutral-600">
          {t("dont_have_an_account")} {/* replace this with your account creation flow */}
          <a href={`${WEBSITE_URL}/signup`} className="font-medium text-neutral-900">
            {t("create_an_account")}
          </a>
        </div>
      </div>

      <AddToHomescreen />
    </div>
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
