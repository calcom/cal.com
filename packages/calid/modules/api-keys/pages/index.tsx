"use client";

import { Dialog, DialogContent } from "@calid/features/ui/components/dialog";
import { useState } from "react";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

import ApiKeyDialogForm from "../components/api-keys-dialog-form";
import ApiKeyListItem from "../components/api-keys-list-item";

type Props = {
  apiKeys: RouterOutputs["viewer"]["apiKeys"]["list"];
};

const ApiKeysView = ({ apiKeys: data }: Props) => {
  const { t } = useLocale();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState<
    (RouterOutputs["viewer"]["apiKeys"]["list"][number] & { neverExpires?: boolean }) | null
  >(null);

  const handleEditClick = (apiKey: RouterOutputs["viewer"]["apiKeys"]["list"][number]) => {
    setSelectedApiKey(apiKey);
    setIsEditModalOpen(true);
  };

  const handleCreateClick = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedApiKey(null);
  };

  return (
    <>
      <SettingsHeader
        title={t("api_keys")}
        description={t("create_first_api_key_description", { appName: APP_NAME })}
        borderInShellHeader={false}
        CTA={data?.length ? <Button onClick={handleCreateClick}>{t("create_api_key")}</Button> : null}>
        <div>
          {data?.length ? (
            <div className="border-subtle rounded-md border">
              {data.map((apiKey, index) => (
                <ApiKeyListItem
                  key={apiKey.id}
                  apiKey={apiKey}
                  lastItem={data.length === index + 1}
                  onEditClick={() => handleEditClick(apiKey)}
                />
              ))}
            </div>
          ) : (
            <EmptyScreen
              Icon="link"
              headline={t("create_first_api_key")}
              description={t("create_first_api_key_description", { appName: APP_NAME })}
              buttonRaw={<Button onClick={handleCreateClick}>{t("create_api_key")}</Button>}
            />
          )}
        </div>
      </SettingsHeader>

      {/* Create API Key Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent size="md" type="creation" title={t("create_api_key")}>
          <ApiKeyDialogForm onCancel={handleCloseCreateModal} />
        </DialogContent>
      </Dialog>

      {/* Edit API Key Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent size="md" type="creation" title={t("edit_api_key")}>
          {selectedApiKey && (
            <ApiKeyDialogForm defaultValues={selectedApiKey} onCancel={handleCloseEditModal} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApiKeysView;
