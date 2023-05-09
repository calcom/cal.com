import { useCallback, useState } from "react";

import type { EventLocationType } from "@calcom/app-store/locations";
import { getEventLocationTypeFromApp } from "@calcom/app-store/locations";
import { AppSetDefaultLinkDialog } from "@calcom/features/apps/components/AppSetDefaultLinkDialog";
import { BulkEditDefaultConferencingModal } from "@calcom/features/eventtypes/components/BulkEditDefaultConferencingModal";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  Dropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownItem,
  DropdownMenuTrigger,
  List,
  Meta,
  showToast,
  SkeletonContainer,
  SkeletonText,
} from "@calcom/ui";
import { AlertCircle, MoreHorizontal, Trash, Video, Plus } from "@calcom/ui/components/icon";

import AppListCard from "@components/AppListCard";
import PageWrapper from "@components/PageWrapper";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} />
      <div className="divide-subtle mt-6 mb-8 space-y-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
      </div>
    </SkeletonContainer>
  );
};

const AddConferencingButton = () => {
  const { t } = useLocale();

  return (
    <>
      <Button color="secondary" StartIcon={Plus} href="/apps/categories/video">
        {t("add_conferencing_app")}
      </Button>
    </>
  );
};

const ConferencingLayout = () => {
  const { t } = useLocale();
  const utils = trpc.useContext();

  const { data: defaultConferencingApp, isLoading: defaultConferencingAppLoading } =
    trpc.viewer.getUsersDefaultConferencingApp.useQuery();

  const { data: apps, isLoading } = trpc.viewer.integrations.useQuery({
    variant: "conferencing",
    onlyInstalled: true,
  });
  const deleteAppMutation = trpc.viewer.deleteCredential.useMutation({
    onSuccess: () => {
      showToast("Integration deleted successfully", "success");
      utils.viewer.integrations.invalidate({ variant: "conferencing", onlyInstalled: true });
      setDeleteAppModal(false);
    },
    onError: () => {
      showToast("Error deleting app", "error");
      setDeleteAppModal(false);
    },
  });

  const onSuccessCallback = useCallback(() => {
    setBulkUpdateModal(true);
    showToast("Default app updated successfully", "success");
  }, []);

  const updateDefaultAppMutation = trpc.viewer.updateUserDefaultConferencingApp.useMutation({
    onSuccess: async () => {
      await utils.viewer.getUsersDefaultConferencingApp.invalidate();
      onSuccessCallback();
    },
    onError: (error) => {
      showToast(`Error: ${error.message}`, "error");
    },
  });

  const [deleteAppModal, setDeleteAppModal] = useState(false);
  const [bulkUpdateModal, setBulkUpdateModal] = useState(false);
  const [locationType, setLocationType] = useState<(EventLocationType & { slug: string }) | undefined>(
    undefined
  );
  const [deleteCredentialId, setDeleteCredentialId] = useState<number>(0);

  if (isLoading || defaultConferencingAppLoading)
    return <SkeletonLoader title={t("conferencing")} description={t("conferencing_description")} />;

  return (
    <div className="bg-default w-full sm:mx-0 xl:mt-0">
      <Meta
        title={t("conferencing")}
        description={t("conferencing_description")}
        CTA={<AddConferencingButton />}
      />
      <List>
        {apps?.items &&
          apps.items
            .map((app) => ({ ...app, title: app.title || app.name }))
            .map((app) => {
              const appSlug = app?.slug;
              const appIsDefault =
                appSlug === defaultConferencingApp?.appSlug ||
                (appSlug === "daily-video" && !defaultConferencingApp?.appSlug); // Default to cal video if the user doesnt have it set (we do this on new account creation but not old)
              return (
                <AppListCard
                  description={app.description}
                  title={app.title}
                  logo={app.logo}
                  key={app.title}
                  isDefault={appIsDefault} // @TODO: Handle when a user doesnt have this value set
                  actions={
                    <div>
                      <Dropdown>
                        <DropdownMenuTrigger asChild>
                          <Button StartIcon={MoreHorizontal} variant="icon" color="secondary" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {!appIsDefault && (
                            <DropdownMenuItem>
                              <DropdownItem
                                type="button"
                                color="secondary"
                                StartIcon={Video}
                                onClick={() => {
                                  const locationType = getEventLocationTypeFromApp(
                                    app?.locationOption?.value ?? ""
                                  );
                                  if (locationType?.linkType === "static") {
                                    setLocationType({ ...locationType, slug: appSlug });
                                  } else {
                                    updateDefaultAppMutation.mutate({
                                      appSlug,
                                    });
                                  }
                                }}>
                                {t("change_default_conferencing_app")}
                              </DropdownItem>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <DropdownItem
                              type="button"
                              color="destructive"
                              disabled={app.isGlobal}
                              StartIcon={Trash}
                              onClick={() => {
                                setDeleteCredentialId(app.credentialIds[0]);
                                setDeleteAppModal(true);
                              }}>
                              {t("remove_app")}
                            </DropdownItem>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </Dropdown>
                    </div>
                  }
                />
              );
            })}
      </List>

      <Dialog open={deleteAppModal} onOpenChange={setDeleteAppModal}>
        <DialogContent
          title={t("Remove app")}
          description={t("are_you_sure_you_want_to_remove_this_app")}
          type="confirmation"
          Icon={AlertCircle}>
          <DialogFooter>
            <Button color="primary" onClick={() => deleteAppMutation.mutate({ id: deleteCredentialId })}>
              {t("yes_remove_app")}
            </Button>
            <DialogClose />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {locationType && (
        <AppSetDefaultLinkDialog
          locationType={locationType}
          setLocationType={setLocationType}
          onSuccess={onSuccessCallback}
        />
      )}
      {bulkUpdateModal && (
        <BulkEditDefaultConferencingModal open={bulkUpdateModal} setOpen={setBulkUpdateModal} />
      )}
    </div>
  );
};

ConferencingLayout.getLayout = getLayout;
ConferencingLayout.PageWrapper = PageWrapper;

export default ConferencingLayout;
