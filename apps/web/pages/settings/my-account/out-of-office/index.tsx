import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CreateOrEditOutOfOfficeEntryModal } from "@calcom/features/settings/CreateOrEditOutOfOfficeModal";
import { OutOfOfficeEntriesList } from "@calcom/features/settings/OutOfOfficeEntriesList";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, Icon, Meta, SkeletonText } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

export type BookingRedirectForm = {
  dateRange: { startDate: Date; endDate: Date };
  offset: number;
  toTeamUserId: number | null;
  reasonId: number;
  notes?: string;
  uuid?: string | null;
};

const OutOfOfficePage = () => {
  const { t } = useLocale();

  const params = useSearchParams();
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

  const { isPending } = trpc.viewer.outOfOfficeReasonList.useQuery();
  return (
    <>
      <Meta
        title={t("out_of_office")}
        description={t("out_of_office_description")}
        borderInShellHeader={false}
        CTA={
          isPending ? (
            <SkeletonText className="h-8 w-20" />
          ) : (
            <Button
              color="primary"
              className="flex w-20 items-center justify-between px-4"
              onClick={() => setOpenModal(true)}
              data-testid="add_entry_ooo">
              <Icon name="plus" size={16} /> {t("add")}
            </Button>
          )
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
        />
      )}
      <OutOfOfficeEntriesList editOutOfOfficeEntry={editOutOfOfficeEntry} />
    </>
  );
};

OutOfOfficePage.getLayout = getLayout;
OutOfOfficePage.PageWrapper = PageWrapper;

export default OutOfOfficePage;
