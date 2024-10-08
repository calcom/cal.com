"use client";

import OrgAttributesEditPage, {
  getLayout,
} from "@calcom/ee/organizations/pages/settings/attributes/attributes-edit-view";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const Page = () => {
  const { t } = useLocale();
  return (
    <>
      <Meta title="Attribute" description={t("edit_attribute_description")} />
      <OrgAttributesEditPage />
    </>
  );
};

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
