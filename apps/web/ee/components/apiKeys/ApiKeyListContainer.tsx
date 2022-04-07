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

export default function ApiKeyListContainer() {
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.apiKeys.list"]);

  const [newApiKeyModal, setNewApiKeyModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editing, setEditing] = useState<TApiKeys | null>(null);
  return (
    <QueryCell
      query={query}
      success={({ data }) => (
        <>
          <div className="flex flex-row justify-between truncate pl-2 pr-1 ">
            <div className="mt-9">
              <h2 className="font-cal text-lg font-medium leading-6 text-gray-900">{t("api_keys")}</h2>
              <p className="mt-1 mb-5 text-sm text-gray-500">{t("api_keys_subtitle")}</p>
            </div>
            <div className="self-center">
              <Button
                StartIcon={PlusIcon}
                color="secondary"
                onClick={() => setNewApiKeyModal(true)}
                data-testid="new_token">
                {t("generate_new_token")}
              </Button>
            </div>
          </div>

          {data.length ? (
            <List className="pb-6">
              {data.map((item) => (
                <ApiKeyListItem
                  key={item.id}
                  apiKey={item}
                  onEditApiKey={() => {
                    setEditing(item);
                    setEditModalOpen(true);
                  }}
                />
              ))}
            </List>
          ) : null}

          {/* New webhook dialog */}
          <Dialog open={newApiKeyModal} onOpenChange={(isOpen) => !isOpen && setNewApiKeyModal(false)}>
            <DialogContent>
              <ApiKeyDialogForm handleClose={() => setNewApiKeyModal(false)} />
            </DialogContent>
          </Dialog>
          {/* Edit webhook dialog */}
          <Dialog open={editModalOpen} onOpenChange={(isOpen) => !isOpen && setEditModalOpen(false)}>
            <DialogContent>
              {editing && (
                <ApiKeyDialogForm
                  key={editing.id}
                  handleClose={() => setEditModalOpen(false)}
                  defaultValues={editing}
                />
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    />
  );
}
