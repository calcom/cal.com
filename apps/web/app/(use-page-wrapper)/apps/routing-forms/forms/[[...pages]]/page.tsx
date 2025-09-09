import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import Forms from "@calcom/app-store/routing-forms/pages/forms/[...appPages]";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export const generateMetadata = async ({ params }: { params: Promise<{ pages: string[] }> }) => {
  const pages = (await params).pages;

  return await _generateMetadata(
    (t) => `${t("routing_forms")} | Cal.com Forms`,
    () => "",
    undefined,
    undefined,
    `/routing/forms/${pages?.length > 0 ? pages.join("/") : ""}`
  );
};

const ServerPage = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  return <Forms appUrl="/routing" />;
};

export default ServerPage;
