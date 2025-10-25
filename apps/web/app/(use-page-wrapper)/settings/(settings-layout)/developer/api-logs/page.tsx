import { _generateMetadata } from "app/_utils";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import ApiLogsView from "@calcom/features/api-logs/ApiLogsView";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("api_logs"),
    (t) => t("api_logs_description")
  );

export default async function ApiLogsPage() {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  return <ApiLogsView />;
}
