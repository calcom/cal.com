import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import CreateNewOutOfOfficeEntryButton from "@calcom/features/settings/outOfOffice/CreateNewOutOfOfficeEntryButton";
import { OutOfOfficeEntriesList } from "@calcom/features/settings/outOfOffice/OutOfOfficeEntriesList";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Meta, SkeletonText } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const Page = () => {
  const { t } = useLocale();

  const { isPending } = trpc.viewer.outOfOfficeReasonList.useQuery();

  return (
    <>
      <Meta
        title={t("out_of_office")}
        description={t("out_of_office_description")}
        borderInShellHeader={false}
        CTA={isPending ? <SkeletonText className="h-8 w-20" /> : <CreateNewOutOfOfficeEntryButton />}
      />
      <OutOfOfficeEntriesList />
    </>
  );
};

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
