import { GetServerSidePropsContext } from "next";
import { useState } from "react";

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
import { FiAlertCircle, FiMoreHorizontal, FiTrash } from "@calcom/ui/components/icon";

import AppListCard from "@components/AppListCard";

import { ssrInit } from "@server/lib/ssr";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} />
      <div className="mt-6 mb-8 space-y-6 divide-y">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
      </div>
    </SkeletonContainer>
  );
};

const ConferencingLayout = () => {
  const { t } = useLocale();
  const utils = trpc.useContext();

  const { data: apps, isLoading } = trpc.viewer.integrations.useQuery(
    { variant: "conferencing", onlyInstalled: true },
    {
      suspense: true,
    }
  );
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

  const [deleteAppModal, setDeleteAppModal] = useState(false);
  const [deleteCredentialId, setDeleteCredentialId] = useState<number>(0);

  if (isLoading)
    return <SkeletonLoader title={t("conferencing")} description={t("conferencing_description")} />;

  return (
    <div className="w-full bg-white sm:mx-0 xl:mt-0">
      <Meta title={t("conferencing")} description={t("conferencing_description")} />
      <List>
        {apps?.items &&
          apps.items
            .map((app) => ({ ...app, title: app.title || app.name }))
            .map((app) => (
              <AppListCard
                description={app.description}
                title={app.title}
                logo={app.logo}
                key={app.title}
                isDefault={app.isGlobal}
                actions={
                  <div>
                    <Dropdown>
                      <DropdownMenuTrigger asChild>
                        <Button StartIcon={FiMoreHorizontal} variant="icon" color="secondary" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>
                          <DropdownItem
                            type="button"
                            color="destructive"
                            disabled={app.isGlobal}
                            StartIcon={FiTrash}
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
            ))}
      </List>

      <Dialog open={deleteAppModal} onOpenChange={setDeleteAppModal}>
        <DialogContent
          title={t("Remove app")}
          description={t("are_you_sure_you_want_to_remove_this_app")}
          type="confirmation"
          Icon={FiAlertCircle}>
          <DialogFooter>
            <Button color="primary" onClick={() => deleteAppMutation.mutate({ id: deleteCredentialId })}>
              {t("yes_remove_app")}
            </Button>
            <DialogClose />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

ConferencingLayout.getLayout = getLayout;

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);

  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};

export default ConferencingLayout;
