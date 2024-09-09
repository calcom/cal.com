import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

import ApiKeysView from "~/settings/developer/api-keys-view";
import NewApiKeyButton from "~/settings/developer/components/CreateApiKeyButton";

const Page = () => {
  const { t } = useLocale();

  return (
    <>
      <Meta
        title={t("api_keys")}
        description={t("create_first_api_key_description", { appName: APP_NAME })}
        CTA={<NewApiKeyButton />}
        borderInShellHeader={true}
      />
      <ApiKeysView />
    </>
  );
};

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
