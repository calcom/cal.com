import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import Button from "@calcom/ui/Button";
import { Dialog, DialogContent } from "@calcom/ui/Dialog";
import { Icon } from "@calcom/ui/Icon";
import { List } from "@calcom/ui/List";
import { ShellSubHeading } from "@calcom/ui/Shell";
import SkeletonLoader from "@calcom/ui/apps/SkeletonLoader";

import LicenseRequired from "../../common/components/LicenseRequired";
import ApiKeyDialogForm from "./ApiKeyDialogForm";
import ApiKeyListItem, { TApiKeys } from "./ApiKeyListItem";

function ApiKeyListContainer() {
  const { t } = useLocale();
  const query = trpc.viewer.apiKeys.list.useQuery();
  const data = query.data;

  const [newApiKeyModal, setNewApiKeyModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [apiKeyToEdit, setApiKeyToEdit] = useState<(TApiKeys & { neverExpires?: boolean }) | null>(null);
  return (
    <div className="border-b border-gray-200 py-8 pl-2 pr-1">
      <ShellSubHeading
        className="mt-2"
        title={t("api_keys")}
        subtitle={t("api_keys_subtitle")}
        actions={
          <Button
            color="minimal"
            size="icon"
            StartIcon={Icon.FiPlus}
            onClick={() => setNewApiKeyModal(true)}
          />
        }
      />
      <LicenseRequired>
        {(() => {
          if (query.isLoading) return <SkeletonLoader />;
          if (!data) return null;
          return (
            <>
              {data.length > 0 && (
                <List className="mt-6">
                  {data.map((item) => (
                    <ApiKeyListItem
                      key={item.id}
                      apiKey={item}
                      onEditApiKey={() => {
                        setApiKeyToEdit(item);
                        setEditModalOpen(true);
                      }}
                    />
                  ))}
                </List>
              )}

              {/* New api key dialog */}
              <Dialog open={newApiKeyModal} onOpenChange={(isOpen) => !isOpen && setNewApiKeyModal(false)}>
                <DialogContent>
                  <ApiKeyDialogForm
                    title={t("create_api_key")}
                    handleClose={() => setNewApiKeyModal(false)}
                  />
                </DialogContent>
              </Dialog>
              {/* Edit api key dialog */}
              <Dialog open={editModalOpen} onOpenChange={(isOpen) => !isOpen && setEditModalOpen(false)}>
                <DialogContent>
                  {apiKeyToEdit && (
                    <ApiKeyDialogForm
                      title={t("edit_api_key")}
                      key={apiKeyToEdit.id}
                      handleClose={() => setEditModalOpen(false)}
                      defaultValues={apiKeyToEdit}
                    />
                  )}
                </DialogContent>
              </Dialog>
            </>
          );
        })()}
      </LicenseRequired>
    </div>
  );
}

export default ApiKeyListContainer;
