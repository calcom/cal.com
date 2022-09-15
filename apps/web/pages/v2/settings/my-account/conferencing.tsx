import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { Dropdown, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Button } from "@calcom/ui/v2";
import { Dialog, DialogContent } from "@calcom/ui/v2/core/Dialog";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";
import showToast from "@calcom/ui/v2/core/notifications";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/v2/core/skeleton";
import { List, ListItem, ListItemText, ListItemTitle } from "@calcom/ui/v2/modules/List";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
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

  const { data: apps, isLoading } = trpc.useQuery(
    ["viewer.integrations", { variant: "conferencing", onlyInstalled: true }],
    {
      suspense: true,
    }
  );
  const deleteAppMutation = trpc.useMutation("viewer.deleteCredential", {
    onSuccess: () => {
      showToast("Integration deleted successfully", "success");
      utils.invalidateQueries(["viewer.integrations", { variant: "conferencing", onlyInstalled: true }]);
      setDeleteAppModal(false);
    },
    onError: () => {
      showToast("Error deleting app", "error");
      setDeleteAppModal(false);
    },
  });

  const [deleteAppModal, setDeleteAppModal] = useState(false);
  const [deleteCredentialId, setDeleteCredentialId] = useState<number>(0);

  if (isLoading) return <SkeletonLoader />;

  return (
    <div className="w-full bg-white sm:mx-0 xl:mt-0">
      <Meta title="conferencing" description="conferencing_description" />
      <List roundContainer={true}>
        {apps?.items &&
          apps.items
            .map((app) => ({ ...app, title: app.title || app.name }))
            .map((app) => (
              <ListItem rounded={false} className="flex-col border-0" key={app.title}>
                <div className="flex w-full flex-1 items-center space-x-3 pl-1 pt-1 rtl:space-x-reverse">
                  {
                    // eslint-disable-next-line @next/next/no-img-element
                    app.logo && <img className="h-10 w-10" src={app.logo} alt={app.title} />
                  }
                  <div className="flex-grow truncate pl-2">
                    <ListItemTitle component="h3" className="mb-1 space-x-2">
                      <h3 className="truncate text-sm font-medium text-neutral-900">{app.title}</h3>
                    </ListItemTitle>
                    <ListItemText component="p">{app.description}</ListItemText>
                  </div>
                  <div>
                    <Dropdown>
                      <DropdownMenuTrigger asChild>
                        <Button StartIcon={Icon.FiMoreHorizontal} size="icon" color="secondary" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>
                          <Button
                            color="destructive"
                            StartIcon={Icon.FiTrash}
                            disabled={app.isGlobal}
                            onClick={() => {
                              setDeleteCredentialId(app.credentialIds[0]);
                              setDeleteAppModal(true);
                            }}>
                            {t("remove_app")}
                          </Button>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </Dropdown>
                  </div>
                </div>
              </ListItem>
            ))}
      </List>

      <Dialog open={deleteAppModal} onOpenChange={setDeleteAppModal}>
        <DialogContent
          title={t("Remove app")}
          description={t("are_you_sure_you_want_to_remove_this_app")}
          type="confirmation"
          actionText={t("yes_remove_app")}
          Icon={Icon.FiAlertCircle}
          actionOnClick={() => deleteAppMutation.mutate({ id: deleteCredentialId })}
        />
      </Dialog>
    </div>
  );
};

ConferencingLayout.getLayout = getLayout;

export default ConferencingLayout;
