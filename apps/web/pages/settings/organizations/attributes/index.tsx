import OrgSettingsAttributesPage, {
  getLayout,
} from "@calcom/ee/organizations/pages/settings/attributes/attributes-list-view";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const Page = () => {
  const { t } = useLocale();
  return (
    <>
      <Meta title={t("attributes")} description={t("attribute_meta_description")} />
      <OrgSettingsAttributesPage />
    </>
  );
};
Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
