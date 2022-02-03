import { ResetPasswordRequest } from "@prisma/client";
import dayjs from "dayjs";
import debounce from "lodash/debounce";
import { GetServerSidePropsContext } from "next";
import { getCsrfToken } from "next-auth/react";
import Link from "next/link";
import React, { useMemo } from "react";

import { WEBSITE_URL } from "@lib/config/constants";
import { useLocale } from "@lib/hooks/useLocale";
import prisma from "@lib/prisma";

import AuthContainer from "@components/ui/AuthContainer";
import Button from "@components/ui/Button";

type Props = {
  id: string;
  resetPasswordRequest: ResetPasswordRequest;
  csrfToken: string;
};

export default function Page({ resetPasswordRequest, csrfToken }: Props) {
  const { t } = useLocale();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<{ message: string } | null>(null);
  const [success, setSuccess] = React.useState(false);

  const [password, setPassword] = React.useState("");

  const submitChangePassword = async ({ password, requestId }: { password: string; requestId: string }) => {
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ requestId: requestId, password: password }),
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

  const debouncedChangePassword = debounce(submitChangePassword, 250);

  const Success = () => {
    return (
      <>
        <div className="space-y-6">
          <div>
            <h2 className="mt-6 text-3xl font-extrabold text-center text-gray-900 font-cal">
              {t("success")}
            </h2>
          </div>
          <p>{t("password_has_been_reset_login")}</p>
          <Link href="/auth/login">
            <button
              type="button"
              className="flex justify-center w-full px-4 py-2 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
              {t("login")}
            </button>
          </Link>
        </div>
      </>
    );
  };

  const Expired = () => {
    return (
      <>
        <div className="space-y-6">
          <div>
            <h2 className="mt-6 text-3xl font-extrabold text-center text-gray-900 font-cal">{t("whoops")}</h2>
            <h2 className="text-3xl font-extrabold text-center text-gray-900">{t("request_is_expired")}</h2>
          </div>
          <p>{t("request_is_expired_instructions")}</p>
          <Link href="/auth/forgot-password">
            <button
              type="button"
              className="flex justify-center w-full px-4 py-2 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
              {t("try_again")}
            </button>
          </Link>
        </div>
      </>
    );
  };

  const isRequestExpired = useMemo(() => {
    const now = dayjs();
    return dayjs(resetPasswordRequest.expires).isBefore(now);
  }, [resetPasswordRequest]);

  return (
    <AuthContainer
      title={t("reset_password")}
      description={t("change_your_password")}
      showLogo
      heading={t("reset_password")}
      footerText={
        <>
          {t("dont_have_an_account")} {/* replace this with your account creation flow */}
          <a href={`${WEBSITE_URL}/signup`} className="font-medium text-neutral-900">
            {t("create_an_account")}
          </a>
        </>
      }>
      {isRequestExpired && <Expired />}
      {!isRequestExpired && !success && (
        <>
          <div className="space-y-6">
            <p>{t("enter_new_password")}</p>
            {error && <p className="text-red-600">{error.message}</p>}
          </div>
          <form
            className="space-y-6"
            onSubmit={async (e) => {
              e.preventDefault();

              if (!password) {
                return;
              }

              if (loading) {
                return;
              }

              setLoading(true);
              setError(null);
              setSuccess(false);

              await debouncedChangePassword({ password, requestId: resetPasswordRequest.id });
            }}
            action="#">
            <input name="csrfToken" type="hidden" defaultValue={csrfToken} hidden />
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t("new_password")}
              </label>
              <div className="mt-1">
                <input
                  onChange={(e) => {
                    setPassword(e.target.value);
                  }}
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="password"
                  required
                  className="block w-full px-3 py-2 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-black focus:border-brand sm:text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex space-y-2">
                <Button
                  className={`flex justify-center w-full ${loading ? "cursor-not-allowed" : ""}`}
                  type="submit"
                  disabled={loading}>
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
                  {t("submit")}
                </Button>
              </div>
            </div>
          </form>
        </>
      )}
      {!isRequestExpired && success && (
        <>
          <Success />
        </>
      )}
    </AuthContainer>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const id = context.params?.id as string;

  try {
    const resetPasswordRequest = await prisma.resetPasswordRequest.findUnique({
      rejectOnNotFound: true,
      where: {
        id,
      },
      select: {
        id: true,
        expires: true,
      },
    });

    return {
      props: {
        resetPasswordRequest: {
          ...resetPasswordRequest,
          expires: resetPasswordRequest.expires.toString(),
        },
        id,
        csrfToken: await getCsrfToken({ req: context.req }),
      },
    };
  } catch (reason) {
    return {
      notFound: true,
    };
  }
}
