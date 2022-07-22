import { PlusIcon } from "@heroicons/react/outline";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import Button from "@calcom/ui/Button";
import { Dialog, DialogContent } from "@calcom/ui/Dialog";
import ApiKeyDialogForm from "@ee/components/apiKeys/ApiKeyDialogForm";
import ApiKeyListItem, { TApiKeys } from "@ee/components/apiKeys/ApiKeyListItem";

import { QueryCell } from "@lib/QueryCell";

import { List } from "@components/List";
import { ShellSubHeading } from "@components/Shell";
import SkeletonLoader from "@components/apps/SkeletonLoader";

import LicenseRequired from "../LicenseRequired";

function ApiKeyListContainer() {
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.apiKeys.list"]);

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
            color="secondary"
            size="icon"
            StartIcon={PlusIcon}
            onClick={() => setNewApiKeyModal(true)}
          />
        }
      />
      <LicenseRequired>
        <QueryCell
          query={query}
          customLoader={<SkeletonLoader />}
          success={({ data }) => (
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
          )}
        />
      </LicenseRequired>
    </div>
  );
}

export default ApiKeyListContainer;
