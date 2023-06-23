import { useCallback, useState } from "react";

import { AppSettings } from "@calcom/app-store/_components/AppSettings";
import { InstallAppButton } from "@calcom/app-store/components";
import { getEventLocationTypeFromApp, type EventLocationType } from "@calcom/app-store/locations";
import type { InstalledAppVariants } from "@calcom/app-store/utils";
import { AppSetDefaultLinkDialog } from "@calcom/features/apps/components/AppSetDefaultLinkDialog";
import { BulkEditDefaultConferencingModal } from "@calcom/features/eventtypes/components/BulkEditDefaultConferencingModal";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc, type RouterOutputs } from "@calcom/trpc";
import type { App } from "@calcom/types/App";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  List,
  showToast,
  Button,
  DropdownMenuItem,
  Alert,
} from "@calcom/ui";
import { MoreHorizontal, Trash, Video } from "@calcom/ui/components/icon";

import AppListCard from "@components/AppListCard";

interface AppListProps {
  variant?: (typeof InstalledAppVariants)[number];
  data: RouterOutputs["viewer"]["integrations"];
  handleDisconnect: (credentialId: number) => void;
}

export const AppList = ({ data, handleDisconnect, variant }: AppListProps) => {
  const { data: defaultConferencingApp } = trpc.viewer.getUsersDefaultConferencingApp.useQuery();
  const utils = trpc.useContext();
  const [bulkUpdateModal, setBulkUpdateModal] = useState(false);
  const [locationType, setLocationType] = useState<(EventLocationType & { slug: string }) | undefined>(
    undefined
  );

  const onSuccessCallback = useCallback(() => {
    setBulkUpdateModal(true);
    showToast("Default app updated successfully", "success");
  }, []);

  const updateDefaultAppMutation = trpc.viewer.updateUserDefaultConferencingApp.useMutation({
    onSuccess: () => {
      showToast("Default app updated successfully", "success");
      utils.viewer.getUsersDefaultConferencingApp.invalidate();
    },
    onError: (error) => {
      showToast(`Error: ${error.message}`, "error");
    },
  });

  const { t } = useLocale();
  return (
    <>
      <List>
        {data.items
          .filter((item) => item.invalidCredentialIds)
          .map((item) => {
            const appSlug = item?.slug;
            const appIsDefault =
              appSlug === defaultConferencingApp?.appSlug ||
              (appSlug === "daily-video" && !defaultConferencingApp?.appSlug);
            return (
              <AppListCard
                key={item.name}
                description={item.description}
                title={item.name}
                logo={item.logo}
                isDefault={appIsDefault}
                shouldHighlight
                slug={item.slug}
                invalidCredential={item.invalidCredentialIds.length > 0}
                actions={
                  <div className="flex justify-end">
                    <Dropdown modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button StartIcon={MoreHorizontal} variant="icon" color="secondary" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {!appIsDefault && variant === "conferencing" && (
                          <DropdownMenuItem>
                            <DropdownItem
                              type="button"
                              color="secondary"
                              StartIcon={Video}
                              onClick={() => {
                                const locationType = getEventLocationTypeFromApp(
                                  item?.locationOption?.value ?? ""
                                );
                                if (locationType?.linkType === "static") {
                                  setLocationType({ ...locationType, slug: appSlug });
                                } else {
                                  updateDefaultAppMutation.mutate({
                                    appSlug,
                                  });
                                  setBulkUpdateModal(true);
                                }
                              }}>
                              {t("set_as_default")}
                            </DropdownItem>
                          </DropdownMenuItem>
                        )}
                        <ConnectOrDisconnectAppMenuItem
                          credentialIds={item.credentialIds}
                          type={item.type}
                          isGlobal={item.isGlobal}
                          installed
                          invalidCredentialIds={item.invalidCredentialIds}
                          handleDisconnect={handleDisconnect}
                        />
                      </DropdownMenuContent>
                    </Dropdown>
                  </div>
                }>
                <AppSettings slug={item.slug} />
              </AppListCard>
            );
          })}
      </List>
      {locationType && (
        <AppSetDefaultLinkDialog
          locationType={locationType}
          setLocationType={() => setLocationType(undefined)}
          onSuccess={onSuccessCallback}
        />
      )}

      {bulkUpdateModal && (
        <BulkEditDefaultConferencingModal open={bulkUpdateModal} setOpen={setBulkUpdateModal} />
      )}
    </>
  );
};

function ConnectOrDisconnectAppMenuItem(props: {
  credentialIds: number[];
  type: App["type"];
  isGlobal?: boolean;
  installed?: boolean;
  invalidCredentialIds?: number[];
  handleDisconnect: (credentialId: number) => void;
}) {
  const { type, credentialIds, isGlobal, installed, handleDisconnect } = props;
  const { t } = useLocale();
  const [credentialId] = credentialIds;

  const utils = trpc.useContext();
  const handleOpenChange = () => {
    utils.viewer.integrations.invalidate();
  };

  if (credentialId || type === "stripe_payment" || isGlobal) {
    return (
      <DropdownMenuItem>
        <DropdownItem
          color="destructive"
          onClick={() => handleDisconnect(credentialId)}
          disabled={isGlobal}
          StartIcon={Trash}>
          {t("remove_app")}
        </DropdownItem>
      </DropdownMenuItem>
    );
  }

  if (!installed) {
    return (
      <div className="flex items-center truncate">
        <Alert severity="warning" title={t("not_installed")} />
      </div>
    );
  }

  return (
    <InstallAppButton
      type={type}
      render={(buttonProps) => (
        <Button color="secondary" {...buttonProps} data-testid="integration-connection-button">
          {t("install")}
        </Button>
      )}
      onChanged={handleOpenChange}
    />
  );
}
