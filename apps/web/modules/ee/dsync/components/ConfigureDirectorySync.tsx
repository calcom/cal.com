import { useState } from "react";

import { SkeletonLoader } from "@calcom/web/modules/apps/components/SkeletonLoader";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogTrigger, DialogClose } from "@calcom/ui/components/dialog";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Label } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import CreateDirectory from "./CreateDirectory";
import DirectoryInfo from "./DirectoryInfo";
import GroupTeamMappingTable from "./GroupTeamMappingTable";

const ConfigureDirectorySync = ({ organizationId }: { organizationId: number | null }) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [deleteDirectoryOpen, setDeleteDirectoryOpen] = useState(false);

  const { data, isLoading, isError, error } = trpc.viewer.dsync.get.useQuery({ organizationId });

  const deleteMutation = trpc.viewer.dsync.delete.useMutation({
    async onSuccess() {
      showToast(t("directory_sync_deleted"), "success");
      await utils.viewer.dsync.invalidate();
      setDeleteDirectoryOpen(false);
    },
  });

  if (isLoading) {
    return <SkeletonLoader />;
  }

  const directory = data ?? null;

  const onDeleteConfirmation = (e: Event | React.MouseEvent<HTMLElement, MouseEvent>) => {
    e.preventDefault();

    if (!directory) {
      return;
    }

    deleteMutation.mutate({ organizationId, directoryId: directory.id });
  };

  if (error || isError) {
    return (
      <div>
        <EmptyScreen
          headline="Error"
          description={error.message || "Error getting dsync data"}
          Icon="triangle-alert"
        />
      </div>
    );
  }

  return (
    <div>
      {!directory ? (
        <CreateDirectory orgId={organizationId} />
      ) : (
        <>
          <DirectoryInfo directory={directory} />
          <div className="mt-4">
            <GroupTeamMappingTable />
          </div>

          <hr className="border-subtle my-6" />
          <Label>{t("danger_zone")}</Label>
          {/* Delete directory sync connection */}
          <Dialog open={deleteDirectoryOpen} onOpenChange={setDeleteDirectoryOpen}>
            <DialogTrigger asChild>
              <Button color="destructive" className="mt-1" StartIcon="trash">
                {t("directory_sync_delete_connection")}
              </Button>
            </DialogTrigger>
            <DialogContent
              title={t("directory_sync_delete_title")}
              description={t("directory_sync_delete_description")}
              type="creation"
              Icon="triangle-alert">
              <>
                <div className="mb-10">
                  <p className="text-default mb-4">{t("directory_sync_delete_confirmation")}</p>
                </div>
                <DialogFooter showDivider>
                  <DialogClose />
                  <Button
                    color="primary"
                    data-testid="delete-account-confirm"
                    onClick={onDeleteConfirmation}
                    loading={deleteMutation.isPending}>
                    {t("directory_sync_delete_connection")}
                  </Button>
                </DialogFooter>
              </>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default ConfigureDirectorySync;
