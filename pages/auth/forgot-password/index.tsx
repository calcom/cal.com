import debounce from "lodash/debounce";
import { GetServerSidePropsContext } from "next";
import { getCsrfToken } from "next-auth/client";
import React, { SyntheticEvent } from "react";

import { getSession } from "@lib/auth";
import { useLocale } from "@lib/hooks/useLocale";

import { TextField } from "@components/form/fields";
import { HeadSeo } from "@components/seo/head-seo";
import Button from "@components/ui/Button";

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
      <HeadSeo title={t("forgot_password")} description={t("request_password_reset")} />
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="px-4 pt-3 pb-8 mx-2 space-y-6 bg-white rounded-lg shadow sm:px-10">
          {success && <Success />}
          {!success && (
            <>
              <div className="space-y-6">
                <h2 className="mt-6 text-3xl font-extrabold text-center text-gray-900 font-cal">
                  {t("forgot_password")}
                </h2>
                <p className="text-sm text-gray-500">{t("reset_instructions")}</p>
                {error && <p className="text-red-600">{error.message}</p>}
              </div>
              <form className="space-y-6" onSubmit={handleSubmit} action="#">
                <input name="csrfToken" type="hidden" defaultValue={csrfToken} hidden />

                <TextField
                  onChange={handleChange}
                  id="email"
                  name="email"
                  label={t("email_address")}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="john.doe@example.com"
                  required
                />
                <div className="space-y-2">
                  <Button
                    className="justify-center w-full"
                    type="submit"
                    disabled={loading}
                    aria-label={t("request_password_reset")}
                    loading={loading}>
                    {t("request_password_reset")}
                  </Button>

                  <Button
                    href="/auth/login"
                    color="minimal"
                    role="button"
                    aria-label={t("login_instead")}
                    className="justify-center w-full">
                    {t("login_instead")}
                  </Button>
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
