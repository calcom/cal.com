import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { useCompatSearchParams } from "@calcom/embed-core/src/useCompatSearchParams";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import CreateNewOutOfOfficeEntryButton from "@calcom/features/settings/outOfOffice/CreateNewOutOfOfficeEntryButton";
import {
  OutOfOfficeEntriesList,
  OutOfOfficeTab,
} from "@calcom/features/settings/outOfOffice/OutOfOfficeEntriesList";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Meta, SkeletonText, ToggleGroup } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const Page = () => {
  const { t } = useLocale();

  const searchParams = useCompatSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Get a new searchParams string by merging the current searchParams with a provided key/value pair
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams ?? undefined);
      params.set(name, value);

      return params.toString();
    },
    [searchParams]
  );

  const [selectedTab, setSelectedTab] = useState(searchParams?.get("type") ?? OutOfOfficeTab.MINE);
  const [oooEntriesAdded, setOOOEntriesAdded] = useState(0);

  const { isPending } = trpc.viewer.outOfOfficeReasonList.useQuery();

  const { data } = trpc.viewer.organizations.listCurrent.useQuery();
  const isOrgAdminOrOwner =
    data && (data.user.role === MembershipRole.OWNER || data.user.role === MembershipRole.ADMIN);
  const toggleGroupOptions = [{ value: OutOfOfficeTab.MINE, label: t("my_ooo") }];
  if (isOrgAdminOrOwner) {
    toggleGroupOptions.push({ value: OutOfOfficeTab.TEAM, label: t("team_ooo") });
  }

  return (
    <>
      <Meta
        title={t("out_of_office")}
        description={
          selectedTab === OutOfOfficeTab.TEAM
            ? t("out_of_office_team_description")
            : t("out_of_office_description")
        }
        borderInShellHeader={false}
        CTA={
          <div className="flex gap-2">
            <ToggleGroup
              className="hidden md:block"
              defaultValue={selectedTab}
              onValueChange={(value) => {
                if (!value) return;
                router.push(`${pathname}?${createQueryString("type", value)}`);
                setSelectedTab(value);
              }}
              options={toggleGroupOptions}
              disabled={!isOrgAdminOrOwner}
            />
            {isPending ? (
              <SkeletonText className="h-8 w-20" />
            ) : (
              <CreateNewOutOfOfficeEntryButton setOOOEntriesAdded={setOOOEntriesAdded} />
            )}
          </div>
        }
      />
      <OutOfOfficeEntriesList oooEntriesAdded={oooEntriesAdded} />
    </>
  );
};

Page.getLayout = getLayout;
Page.PageWrapper = PageWrapper;

export default Page;
