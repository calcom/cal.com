import { PlusIcon } from "@heroicons/react/outline";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import Button from "@calcom/ui/Button";
import { Dialog, DialogContent } from "@calcom/ui/Dialog";
import ApiKeyDialogForm from "@ee/components/apiKeys/ApiKeyDialogForm";
import ApiKeyListItem, { TApiKeys } from "@ee/components/apiKeys/ApiKeyListItem";

import { QueryCell } from "@lib/QueryCell";
import { trpc } from "@lib/trpc";

import { List } from "@components/List";

import LicenseRequired from "../LicenseRequired";

function ApiKeyListContainer() {
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.apiKeys.list"]);

  const [newApiKeyModal, setNewApiKeyModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [apiKeyToEdit, setApiKeyToEdit] = useState<(TApiKeys & { neverExpires?: boolean }) | null>(null);
  return (
    <>
      <div className="flex flex-col justify-between truncate pl-2 pr-1 sm:flex-row">
        <div className="mt-9">
          <h2 className="font-cal text-lg font-medium leading-6 text-gray-900">{t("api_keys")}</h2>
          <p className="mt-1 mb-5 text-sm text-gray-500">{t("api_keys_subtitle")}</p>
        </div>
        <div className="mb-9 sm:self-center">
          <Button StartIcon={PlusIcon} color="secondary" onClick={() => setNewApiKeyModal(true)}>
            {t("generate_new_api_key")}
          </Button>
        </div>
      </div>
      <LicenseRequired>
        <QueryCell
          query={query}
          success={({ data }) => (
            <>
              {data.length > 0 && (
                <List className="pb-6">
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
    </>
  );
}

export default ApiKeyListContainer;
