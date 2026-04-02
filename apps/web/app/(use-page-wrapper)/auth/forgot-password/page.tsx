import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import type { PageProps as ServerPageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCsrfToken } from "next-auth/react";
import ForgotPassword from "~/auth/forgot-password/forgot-password-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("forgot_password"),
    (t) => t("request_password_reset"),
    undefined,
    undefined,
    "/auth/forgot-password"
  );
};

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const session = await getServerSession({ req: context.req });

  if (session) {
    redirect("/");
  }

  const csrfToken = await getCsrfToken(context);

  return <ForgotPassword csrfToken={csrfToken} />;
};

export default ServerPage;
