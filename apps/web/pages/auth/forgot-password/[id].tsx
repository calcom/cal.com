import type { GetServerSidePropsContext } from "next";
import { getCsrfToken } from "next-auth/react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useForm } from "react-hook-form";

import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { Button, PasswordField, Form } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import AuthContainer from "@components/ui/AuthContainer";

type Props = {
  requestId: string;
  isRequestExpired: boolean;
  csrfToken: string;
};

export default function Page({ requestId, isRequestExpired, csrfToken }: Props) {
  const { t } = useLocale();
  const formMethods = useForm<{ new_password: string }>();
  const success = formMethods.formState.isSubmitSuccessful;
  const loading = formMethods.formState.isSubmitting;
  const passwordValue = formMethods.watch("new_password");
  const isEmpty = passwordValue?.length === 0;

  const submitChangePassword = async ({ password, requestId }: { password: string; requestId: string }) => {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ requestId, password }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const json = await res.json();
    if (!res.ok) return formMethods.setError("new_password", { type: "server", message: json.message });
  };

  const Success = () => {
    return (
      <>
        <div className="space-y-6">
          <div>
            <h2 className="font-cal text-emphasis mt-6 text-center text-3xl font-extrabold">
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
            <h2 className="font-cal text-emphasis mt-6 text-center text-3xl font-extrabold">{t("whoops")}</h2>
            <h2 className="text-emphasis text-center text-3xl font-extrabold">{t("request_is_expired")}</h2>
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

  return (
    <AuthContainer
      showLogo
      title={t("reset_password")}
      description={t("change_your_password")}
      heading={!success ? t("reset_password") : undefined}>
      {isRequestExpired && <Expired />}
      {!isRequestExpired && !success && (
        <>
          <Form
            className="space-y-6"
            form={formMethods}
            style={
              {
                "--cal-brand": "#111827",
                "--cal-brand-emphasis": "#101010",
                "--cal-brand-text": "white",
                "--cal-brand-subtle": "#9CA3AF",
              } as CSSProperties
            }
            handleSubmit={async (values) => {
              await submitChangePassword({
                password: values.new_password,
                requestId,
              });
            }}>
            <input name="csrfToken" type="hidden" defaultValue={csrfToken} hidden />
            <div className="mt-1">
              <PasswordField
                {...formMethods.register("new_password", {
                  minLength: {
                    message: t("password_hint_min"),
                    value: 7, // We don't have user here so we can't check if they are admin or not
                  },
                  pattern: {
                    message: "Should contain a number, uppercase and lowercase letters",
                    value: /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).*$/gm,
                  },
                })}
                label={t("new_password")}
              />
            </div>

            <div>
              <Button
                loading={loading}
                color="primary"
                type="submit"
                disabled={loading || isEmpty}
                className="w-full justify-center">
                {t("reset_password")}
              </Button>
            </div>
          </Form>
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

Page.PageWrapper = PageWrapper;
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const id = context.params?.id as string;

  let resetPasswordRequest = await prisma.resetPasswordRequest.findFirst({
    where: {
      id,
      expires: {
        gt: new Date(),
      },
    },
    select: {
      email: true,
    },
  });
  try {
    resetPasswordRequest &&
      (await prisma.user.findUniqueOrThrow({ where: { email: resetPasswordRequest.email } }));
  } catch (e) {
    resetPasswordRequest = null;
  }
  const locale = await getLocale(context.req);
  return {
    props: {
      isRequestExpired: !resetPasswordRequest,
      requestId: id,
      csrfToken: await getCsrfToken({ req: context.req }),
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}
