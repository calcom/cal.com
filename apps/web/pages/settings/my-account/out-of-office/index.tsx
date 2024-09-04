import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { CreateOrEditOutOfOfficeEntryModal } from "@calcom/features/settings/CreateOrEditOutOfOfficeModal";
import { OutOfOfficeEntriesList, OutOfOfficeTab } from "@calcom/features/settings/OutOfOfficeEntriesList";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/client";
import { trpc } from "@calcom/trpc/react";
import { Button, Icon, Meta, SkeletonText, ToggleGroup } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

export type BookingRedirectForm = {
  dateRange: { startDate: Date; endDate: Date };
  offset: number;
  toTeamUserId: number | null;
  reasonId: number;
  notes?: string;
  uuid?: string | null;
  forUserId: number | null;
};

const OutOfOfficePage = () => {
  const { t } = useLocale();

  const params = useSearchParams();
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

  const openModalOnStart = !!params?.get("om");
  useEffect(() => {
    if (openModalOnStart) {
      setOpenModal(true);
    }
  }, [openModalOnStart]);

  const [openModal, setOpenModal] = useState(false);
  const [currentlyEditingOutOfOfficeEntry, setCurrentlyEditingOutOfOfficeEntry] =
    useState<BookingRedirectForm | null>(null);

  const editOutOfOfficeEntry = (entry: BookingRedirectForm) => {
    setCurrentlyEditingOutOfOfficeEntry(entry);
    setOpenModal(true);
  };

  const [selectedTab, setSelectedTab] = useState(searchParams?.get("type") ?? OutOfOfficeTab.MINE);
  const [oooEntriesUpdated, setOOOEntriesUpdated] = useState(0);
  const { isPending } = trpc.viewer.outOfOfficeReasonList.useQuery();

  const { data } = trpc.viewer.organizations.listCurrent.useQuery();
  const isOrgAdminOrOwner =
    data && (data.user.role === MembershipRole.OWNER || data.user.role === MembershipRole.ADMIN);
  const isOrgAndPrivate = data?.isOrganization && data.isPrivate;
  const toggleGroupOptions = [{ value: OutOfOfficeTab.MINE, label: t("my_ooo") }];
  if (!isOrgAndPrivate || isOrgAdminOrOwner) {
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
            />
            {isPending ? (
              <SkeletonText className="h-8 w-20" />
            ) : (
              <Button
                color="primary"
                className="flex w-20 items-center justify-between px-4"
                onClick={() => setOpenModal(true)}
                data-testid="add_entry_ooo">
                <Icon name="plus" size={16} /> {t("add")}
              </Button>
            )}
          </div>
        }
      />
      {openModal && (
        <CreateOrEditOutOfOfficeEntryModal
          openModal={openModal}
          closeModal={() => {
            setOpenModal(false);
            setCurrentlyEditingOutOfOfficeEntry(null);
          }}
          currentlyEditingOutOfOfficeEntry={currentlyEditingOutOfOfficeEntry}
          oooType={selectedTab}
          setOOOEntriesUpdated={setOOOEntriesUpdated}
        />
      )}
      <OutOfOfficeEntriesList
        editOutOfOfficeEntry={editOutOfOfficeEntry}
        oooEntriesUpdated={oooEntriesUpdated}
        selectedTab={selectedTab as OutOfOfficeTab}
      />
    </>
  );
};

OutOfOfficePage.getLayout = getLayout;
OutOfOfficePage.PageWrapper = PageWrapper;

export default OutOfOfficePage;
