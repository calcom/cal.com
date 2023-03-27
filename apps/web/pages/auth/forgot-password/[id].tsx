import type { ResetPasswordRequest } from "@prisma/client";
import { debounce } from "lodash";
import type { GetServerSidePropsContext } from "next";
import { getCsrfToken } from "next-auth/react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Link from "next/link";
import React, { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { Button, TextField } from "@calcom/ui";

import AuthContainer from "@components/ui/AuthContainer";

type Props = {
  id: string;
  resetPasswordRequest: ResetPasswordRequest;
  csrfToken: string;
};

export default function Page({ resetPasswordRequest, csrfToken }: Props) {
  const { t } = useLocale();
  const [loading, setLoading] = React.useState(false);
  const [, setError] = React.useState<{ message: string } | null>(null);
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
            <h2 className="font-cal mt-6 text-center text-3xl font-extrabold text-gray-900">
              {t("password_updated")}
            </h2>
          </div>
          <Button href="/auth/login" className="w-full justify-center">
            {t("login")}
          </Button>
        </div>
      </>
    );
  };

  const Expired = () => {
    return (
      <>
        <div className="space-y-6">
          <div>
            <h2 className="font-cal mt-6 text-center text-3xl font-extrabold text-gray-900">{t("whoops")}</h2>
            <h2 className="text-center text-3xl font-extrabold text-gray-900">{t("request_is_expired")}</h2>
          </div>
          <p>{t("request_is_expired_instructions")}</p>
          <Link href="/auth/forgot-password" passHref legacyBehavior>
            <button
              type="button"
              className="flex w-full justify-center px-4 py-2 text-sm font-medium text-blue-600 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2">
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
      showLogo
      title={t("reset_password")}
      description={t("change_your_password")}
      heading={!success ? t("reset_password") : undefined}>
      {isRequestExpired && <Expired />}
      {!isRequestExpired && !success && (
        <>
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
            <div className="mt-1">
              <TextField
                label={t("new_password")}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                id="password"
                name="password"
                type="password"
                autoComplete="password"
                required
              />
            </div>

            <div>
              <Button
                loading={loading}
                color="primary"
                type="submit"
                disabled={loading}
                className="w-full justify-center">
                {t("reset_password")}
              </Button>
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
    const resetPasswordRequest = await prisma.resetPasswordRequest.findUniqueOrThrow({
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
        ...(await serverSideTranslations(context.locale || "en", ["common"])),
      },
    };
  } catch (reason) {
    return {
      notFound: true,
    };
  }
}
