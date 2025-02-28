import type { PageProps, PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { getCsrfToken } from "next-auth/react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import ForgotPassword from "~/auth/forgot-password/forgot-password-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("forgot_password"), t("request_password_reset"));
};

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const session = await getServerSession({ req: context.req });

  if (session) {
    redirect("/");
  }

  const csrfToken = await getCsrfToken(context);

  return <ForgotPassword csrfToken={csrfToken} />;
};

export default ServerPage;
