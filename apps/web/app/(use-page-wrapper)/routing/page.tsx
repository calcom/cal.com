import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import Forms from "../apps/routing-forms/forms/[[...pages]]/Forms";

const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${t("routing_forms")} | Cal.com Forms`,
    () => "",
    undefined,
    undefined,
    `/routing`
  );
};

const ServerPage = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  return <Forms appUrl="/routing" />;
};

export { generateMetadata };
export default ServerPage;
