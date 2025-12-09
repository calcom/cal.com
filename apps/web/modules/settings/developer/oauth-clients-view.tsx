"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Form, Label, Switch, TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { ImageUploader } from "@calcom/ui/components/image-uploader";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { OAuthClientsSkeleton } from "./oauth-clients-skeleton";

type FormValues = {
  name: string;
  redirectUri: string;
  logo: string;
  enablePkce: boolean;
};

const OAuthClientsView = () => {
  const { t } = useLocale();
  const { copyToClipboard } = useCopy();
  const utils = trpc.useUtils();
  const [showDialog, setShowDialog] = useState(false);
  const [logo, setLogo] = useState("");
  const [logoError, setLogoError] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<{
    clientId: string;
    name: string;
    isPkceEnabled?: boolean;
  } | null>(null);
  const [selectedClient, setSelectedClient] = useState<{
    clientId: string;
    name: string;
    logo?: string | null;
    redirectUri: string;
    approvalStatus: string;
  } | null>(null);

  const oAuthForm = useForm<FormValues>({
    defaultValues: {
      name: "",
      redirectUri: "",
      logo: "",
      enablePkce: false,
    },
  });

  const { data: oAuthClients, isLoading } = trpc.viewer.oAuth.listUserClients.useQuery();

  const submitMutation = trpc.viewer.oAuth.submitClient.useMutation({
    onSuccess: async (data) => {
      setSubmittedClient({
        clientId: data.clientId,
        name: data.name,
        isPkceEnabled: data.isPkceEnabled,
      });
      showToast(t("oauth_client_submitted"), "success");
      utils.viewer.oAuth.listUserClients.invalidate();
    },
    onError: (error) => {
      showToast(`${t("oauth_client_submit_error")}: ${error.message}`, "error");
    },
  });

  const handleSubmit = (values: FormValues) => {
    if (!values.logo) {
      setLogoError(true);
      return;
    }
    setLogoError(false);
    submitMutation.mutate({
      name: values.name,
      redirectUri: values.redirectUri,
      logo: values.logo,
      enablePkce: values.enablePkce,
    });
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setSubmittedClient(null);
    setLogo("");
    setLogoError(false);
    oAuthForm.reset();
  };

  const handleCloseClientDialog = () => {
    setSelectedClient(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="success">{t("approved")}</Badge>;
      case "REJECTED":
        return <Badge variant="red">{t("rejected")}</Badge>;
      case "PENDING":
      default:
        return <Badge variant="orange">{t("pending")}</Badge>;
    }
  };

  if (isLoading) {
    return <OAuthClientsSkeleton />;
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button color="primary" StartIcon="plus" onClick={() => setShowDialog(true)}>
          {t("new_oauth_client")}
        </Button>
      </div>

      {oAuthClients && oAuthClients.length > 0 ? (
        <div className="border-subtle rounded-lg border">
          {oAuthClients.map((client, index) => (
            <div
              key={client.clientId}
              className={`hover:bg-subtle flex cursor-pointer items-center justify-between p-4 transition-colors ${
                index !== oAuthClients.length - 1 ? "border-subtle border-b" : ""
              }`}
              onClick={() => setSelectedClient(client)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setSelectedClient(client);
                }
              }}>
              <div className="flex items-center gap-4">
                <Avatar
                  alt={client.name}
                  imageSrc={client.logo || undefined}
                  fallback={<Icon name="key" className="text-subtle h-6 w-6" />}
                  size="md"
                />
                <div>
                  <div className="text-emphasis font-medium">{client.name}</div>
                  <div className="text-subtle text-sm">{client.redirectUri}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {getStatusBadge(client.approvalStatus)}
                <Icon name="chevron-right" className="text-subtle h-5 w-5" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyScreen
          Icon="key"
          headline={t("no_oauth_clients")}
          description={t("no_oauth_clients_description")}
          buttonRaw={
            <Button color="primary" StartIcon="plus" onClick={() => setShowDialog(true)}>
              {t("new_oauth_client")}
            </Button>
          }
        />
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent
          type="creation"
          title={submittedClient ? t("oauth_client_submitted") : t("new_oauth_client")}
          description={
            submittedClient ? t("oauth_client_submitted_description") : t("new_oauth_client_description")
          }>
          {!submittedClient ? (
            <Form form={oAuthForm} handleSubmit={handleSubmit} className="space-y-4">
              <TextField
                {...oAuthForm.register("name", { required: true })}
                label={t("client_name")}
                type="text"
                id="name"
                placeholder={t("client_name_placeholder")}
                required
              />
              <TextField
                {...oAuthForm.register("redirectUri", { required: true })}
                label={t("redirect_uri")}
                type="url"
                id="redirectUri"
                placeholder="https://example.com/callback"
                required
              />

              <div>
                <Label className="text-emphasis mb-2 block text-sm font-medium">
                  {t("authentication_mode")}
                </Label>
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={oAuthForm.watch("enablePkce")}
                    onCheckedChange={(checked) => oAuthForm.setValue("enablePkce", checked)}
                  />
                  <span className="text-default text-sm">{t("use_pkce")}</span>
                </div>
              </div>

              <div>
                <Label className="text-emphasis mb-2 block text-sm font-medium">
                  {t("logo")} <span className="text-error">*</span>
                </Label>
                <div className="flex items-center">
                  <Avatar
                    alt=""
                    fallback={<Icon name="plus" className="text-subtle h-6 w-6" />}
                    className="mr-5 items-center"
                    imageSrc={logo}
                    size="lg"
                  />
                  <ImageUploader
                    target="avatar"
                    id="avatar-upload"
                    buttonMsg={t("upload_logo")}
                    handleAvatarChange={(newLogo: string) => {
                      setLogo(newLogo);
                      setLogoError(false);
                      oAuthForm.setValue("logo", newLogo);
                    }}
                    imageSrc={logo}
                  />
                </div>
                {logoError && <p className="text-error mt-2 text-sm">{t("logo_required")}</p>}
              </div>

              <DialogFooter>
                <DialogClose onClick={handleCloseDialog}>{t("cancel")}</DialogClose>
                <Button type="submit" loading={submitMutation.isPending}>
                  {t("submit_for_approval")}
                </Button>
              </DialogFooter>
            </Form>
          ) : (
            <div>
              <div className="text-emphasis mb-5 text-xl font-semibold">{submittedClient.name}</div>
              <div className="text-subtle mb-1 text-sm">{t("client_id")}</div>
              <div className="flex">
                <code className="bg-subtle text-default w-full truncate rounded-md rounded-r-none px-2 py-1 align-middle font-mono text-sm">
                  {submittedClient.clientId}
                </code>
                <Tooltip side="top" content={t("copy_to_clipboard")}>
                  <Button
                    onClick={() => {
                      copyToClipboard(submittedClient.clientId, {
                        onSuccess: () => showToast(t("client_id_copied"), "success"),
                      });
                    }}
                    type="button"
                    size="sm"
                    className="rounded-l-none"
                    StartIcon="clipboard">
                    {t("copy")}
                  </Button>
                </Tooltip>
              </div>
              <div className="text-subtle mt-4 text-sm">{t("oauth_client_pending_approval")}</div>
              <DialogFooter className="mt-6">
                <Button onClick={handleCloseDialog}>{t("done")}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedClient} onOpenChange={(open) => !open && handleCloseClientDialog()}>
        <DialogContent type="creation" title={selectedClient?.name || ""}>
          {selectedClient && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar
                  alt={selectedClient.name}
                  imageSrc={selectedClient.logo || undefined}
                  fallback={<Icon name="key" className="text-subtle h-6 w-6" />}
                  size="lg"
                />
                <div>
                  <div className="text-emphasis font-medium">{selectedClient.name}</div>
                  <div className="text-subtle text-sm">{selectedClient.redirectUri}</div>
                </div>
                {getStatusBadge(selectedClient.approvalStatus)}
              </div>

              <div>
                <div className="text-subtle mb-1 text-sm">{t("client_id")}</div>
                <div className="flex">
                  <code className="bg-subtle text-default w-full truncate rounded-md rounded-r-none px-2 py-1 align-middle font-mono text-sm">
                    {selectedClient.clientId}
                  </code>
                  <Tooltip side="top" content={t("copy_to_clipboard")}>
                    <Button
                      onClick={() => {
                        copyToClipboard(selectedClient.clientId, {
                          onSuccess: () => showToast(t("client_id_copied"), "success"),
                        });
                      }}
                      type="button"
                      size="sm"
                      className="rounded-l-none"
                      StartIcon="clipboard">
                      {t("copy")}
                    </Button>
                  </Tooltip>
                </div>
              </div>

              {selectedClient.approvalStatus === "APPROVED" && (
                <p className="text-subtle text-sm">{t("oauth_client_approved_note")}</p>
              )}

              {selectedClient.approvalStatus === "PENDING" && (
                <p className="text-subtle text-sm">{t("oauth_client_pending_approval")}</p>
              )}

              {selectedClient.approvalStatus === "REJECTED" && (
                <p className="text-error text-sm">{t("oauth_client_rejected")}</p>
              )}

              <DialogFooter>
                <Button onClick={handleCloseClientDialog}>{t("done")}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OAuthClientsView;
