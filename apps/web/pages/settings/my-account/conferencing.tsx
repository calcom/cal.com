import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

import ConferencingView from "~/settings/my-account/conferencing-view";

const Page = () => {
  const { t } = useLocale();

  const AddConferencingButton = () => {
    return (
      <Button color="secondary" StartIcon="plus" href="/apps/categories/conferencing">
        {t("add")}
      </Button>
    );
  };

  return (
    <>
      <Meta
        title={t("conferencing")}
        description={t("conferencing_description")}
        CTA={<AddConferencingButton />}
        borderInShellHeader={true}
      />
      <ConferencingView />
    </>
  );
};

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
