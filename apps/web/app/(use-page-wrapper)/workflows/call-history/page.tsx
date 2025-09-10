import { _generateMetadata } from "app/_utils";

import CallHistoryPage from "@calcom/features/ee/workflows/pages/call-history";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("call_history"),
    (t) => t("call_history_subtitle")
  );

export default async function Page() {
  return <CallHistoryPage />;
}
