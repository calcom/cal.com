import { _generateMetadata } from "app/_utils";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import ApiLogDetailView from "@calcom/features/api-logs/ApiLogDetailView";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("api_log_detail"),
    (t) => t("api_logs_description")
  );

export default async function ApiLogDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  return <ApiLogDetailView id={params.id} />;
}
