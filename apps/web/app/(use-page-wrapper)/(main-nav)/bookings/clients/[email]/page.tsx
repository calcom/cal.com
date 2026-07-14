import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata, getTranslate } from "app/_utils";
import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import ClientDetailView from "~/clients/views/client-detail-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("client_details"),
    (t) => t("client_details_description")
  );

const Page = async ({ params }: { params: Promise<{ email: string }> }) => {
  const t = await getTranslate();
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const { email } = await params;
  const decodedEmail = decodeURIComponent(email);

  return (
    <ShellMainAppDir heading={t("client_details")} subtitle={decodedEmail} backPath="/bookings/clients">
      <ClientDetailView email={email} />
    </ShellMainAppDir>
  );
};

export default Page;
