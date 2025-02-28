import { getTranslate, _generateMetadata } from "app/_utils";
import { Suspense } from "react";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { NewWebhookView } from "@calcom/features/webhooks/pages/webhook-new-view";
import { APP_NAME } from "@calcom/lib/constants";
import { SkeletonContainer, SkeletonText } from "@calcom/ui";
import type { PageProps } from "app/_types";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);
  return await _generateMetadata(t("webhooks"), t("add_webhook_description", { appName: APP_NAME }));
};
const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="divide-subtle border-subtle space-y-6 rounded-b-lg border border-t-0 px-6 py-4">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
      </div>
    </SkeletonContainer>
  );
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);

  return (
    <SettingsHeader
      title={t("add_webhook")}
      description={t("add_webhook_description", { appName: APP_NAME })}
      borderInShellHeader={true}
      backButton>
      <Suspense fallback={<SkeletonLoader />}>
        <NewWebhookView />
      </Suspense>
    </SettingsHeader>
  );
};

export default Page;
