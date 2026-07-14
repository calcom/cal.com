import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata, getTranslate } from "app/_utils";
import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import ClientsListingView from "~/clients/views/clients-listing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("clients"),
    (t) => t("clients_description")
  );

const Page = async () => {
  const t = await getTranslate();
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  return (
    <ShellMainAppDir heading={t("clients")} subtitle={t("clients_description")}>
      <ClientsListingView />
    </ShellMainAppDir>
  );
};

export default Page;
