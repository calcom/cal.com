import debounce from "lodash/debounce";
import { GetServerSidePropsContext } from "next";
import { getCsrfToken } from "next-auth/client";
import Link from "next/link";
import React, { SyntheticEvent } from "react";

import { getSession } from "@lib/auth";
import { useLocale } from "@lib/hooks/useLocale";

import { HeadSeo } from "@components/seo/head-seo";

export default function ForgotPassword({ csrfToken }: { csrfToken: string }) {
  const { t, i18n } = useLocale();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<{ message: string } | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [email, setEmail] = React.useState("");

  const handleChange = (e: SyntheticEvent) => {
    const target = e.target as typeof e.target & { value: string };
    setEmail(target.value);
  };

  const submitForgotPasswordRequest = async ({ email }: { email: string }) => {
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email, language: i18n.language }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json);
      } else {
        setSuccess(true);
      }

      return json;
    } catch (reason) {
      setError({ message: t("unexpected_error_try_again") });
    } finally {
      setLoading(false);
    }
  };

  const debouncedHandleSubmitPasswordRequest = debounce(submitForgotPasswordRequest, 250);

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();

    if (!email) {
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    await debouncedHandleSubmitPasswordRequest({ email });
  };

  const Success = () => {
    return (
      <div className="space-y-6">
        <h2 className="mt-6 text-3xl font-extrabold text-center text-gray-900">{t("done")}</h2>
        <p>{t("check_email_reset_password")}</p>
        {error && <p className="text-red-600">{error.message}</p>}
      </div>
    );
  };

  return (
    <div className="flex flex-col justify-center min-h-screen py-12 bg-gray-50 sm:px-6 lg:px-8">
      <HeadSeo title={t("forgot_password")} description={t("forgot_password")} />
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="px-4 py-8 mx-2 space-y-6 bg-white rounded-lg shadow sm:px-10">
          {success && <Success />}
          {!success && (
            <>
              <div className="space-y-6">
                <h2 className="mt-6 text-3xl font-extrabold text-center text-gray-900 font-cal">
                  {t("forgot_password")}
                </h2>
                <p>{t("reset_instructions")}</p>
                {error && <p className="text-red-600">{error.message}</p>}
              </div>
              <form className="space-y-6" onSubmit={handleSubmit} action="#">
                <input name="csrfToken" type="hidden" defaultValue={csrfToken} hidden />
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    {t("email_address")}
                  </label>
                  <div className="mt-1">
                    <input
                      onChange={handleChange}
                      id="email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="john.doe@example.com"
                      required
                      className="block w-full px-3 py-2 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-black focus:border-brand sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-brandcontrast bg-brand hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black ${
                      loading ? "cursor-not-allowed" : ""
                    }`}>
                    {loading && (
                      <svg
                        className="w-5 h-5 mr-3 -ml-1 text-white animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {t("request_password_reset")}
                  </button>
                </div>
                <div className="space-y-2">
                  <Link href="/auth/login">
                    <button
                      type="button"
                      className="flex justify-center w-full px-4 py-2 text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
                      {t("login")}
                    </button>
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

ForgotPassword.getInitialProps = async (context: GetServerSidePropsContext) => {
  const { req, res } = context;
  const session = await getSession({ req });

  if (session) {
    res.writeHead(302, { Location: "/" });
    res.end();
    return;
  }

  return {
    csrfToken: await getCsrfToken(context),
  };
};
