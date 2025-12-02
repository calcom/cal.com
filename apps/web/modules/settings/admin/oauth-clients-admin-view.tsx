"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogClose,
} from "@calcom/ui/components/dialog";
import {
  Dropdown,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@calcom/ui/components/dropdown";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Form, Label, Switch, TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { ImageUploader } from "@calcom/ui/components/image-uploader";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

type FormValues = {
  name: string;
  redirectUri: string;
  logo: string;
  enablePkce: boolean;
};

export default function OAuthClientsAdminView() {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [logo, setLogo] = useState("");
  const [createdClient, setCreatedClient] = useState<{
    clientId: string;
    clientSecret?: string;
    name: string;
  } | null>(null);

  const oAuthForm = useForm<FormValues>({
    defaultValues: {
      name: "",
      redirectUri: "",
      logo: "",
      enablePkce: false,
    },
  });

  const { data: oAuthClients, isLoading } = trpc.viewer.oAuth.listClients.useQuery({});

  const addMutation = trpc.viewer.oAuth.addClient.useMutation({
    onSuccess: async (data) => {
      setCreatedClient({
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        name: data.name,
      });
      showToast(t("oauth_client_created"), "success");
      utils.viewer.oAuth.listClients.invalidate();
    },
    onError: (error) => {
      showToast(`${t("oauth_client_create_error")}: ${error.message}`, "error");
    },
  });

  const updateStatusMutation = trpc.viewer.oAuth.updateClientStatus.useMutation({
    onSuccess: async (data) => {
      showToast(
        t("oauth_client_status_updated", { name: data.name, status: data.approvalStatus }),
        "success"
      );
      utils.viewer.oAuth.listClients.invalidate();
    },
    onError: (error) => {
      showToast(`${t("oauth_client_status_update_error")}: ${error.message}`, "error");
    },
  });

  const handleAddClient = (values: FormValues) => {
    addMutation.mutate({
      name: values.name,
      redirectUri: values.redirectUri,
      logo: values.logo,
      enablePkce: values.enablePkce,
    });
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setCreatedClient(null);
    setLogo("");
    oAuthForm.reset();
  };

  const handleApprove = (clientId: string) => {
    updateStatusMutation.mutate({ clientId, status: "APPROVED" });
  };

  const handleReject = (clientId: string) => {
    updateStatusMutation.mutate({ clientId, status: "REJECTED" });
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
    return <div className="flex justify-center py-8">{t("loading")}</div>;
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button color="primary" StartIcon="plus" onClick={() => setShowAddDialog(true)}>
          {t("add_oauth_client")}
        </Button>
      </div>

      {oAuthClients && oAuthClients.length > 0 ? (
        <div className="border-subtle overflow-hidden rounded-lg border">
          <table className="w-full">
            <thead className="bg-subtle">
              <tr>
                <th className="text-emphasis px-4 py-3 text-left text-sm font-medium">{t("client_name")}</th>
                <th className="text-emphasis px-4 py-3 text-left text-sm font-medium">{t("redirect_uri")}</th>
                <th className="text-emphasis px-4 py-3 text-left text-sm font-medium">{t("submitted_by")}</th>
                <th className="text-emphasis px-4 py-3 text-left text-sm font-medium">{t("status")}</th>
                <th className="text-emphasis px-4 py-3 text-left text-sm font-medium">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-subtle divide-y">
              {oAuthClients.map((client) => (
                <tr key={client.clientId} className="hover:bg-subtle/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        alt={client.name}
                        imageSrc={client.logo || undefined}
                        fallback={<Icon name="key" className="text-subtle h-4 w-4" />}
                        size="sm"
                      />
                      <span className="text-emphasis font-medium">{client.name}</span>
                    </div>
                  </td>
                  <td className="text-default px-4 py-3 text-sm">{client.redirectUri}</td>
                  <td className="text-default px-4 py-3 text-sm">
                    {client.user ? (
                      <span>
                        {client.user.name || client.user.email}
                      </span>
                    ) : (
                      <span className="text-subtle">{t("admin")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(client.approvalStatus)}</td>
                  <td className="px-4 py-3">
                    <Dropdown>
                      <DropdownMenuTrigger asChild>
                        <Button color="minimal" size="sm" StartIcon="ellipsis" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {client.approvalStatus === "PENDING" && (
                          <>
                            <DropdownMenuItem onClick={() => handleApprove(client.clientId)}>
                              <Icon name="check" className="mr-2 h-4 w-4" />
                              {t("approve")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleReject(client.clientId)}>
                              <Icon name="x" className="mr-2 h-4 w-4" />
                              {t("reject")}
                            </DropdownMenuItem>
                          </>
                        )}
                        {client.approvalStatus === "REJECTED" && (
                          <DropdownMenuItem onClick={() => handleApprove(client.clientId)}>
                            <Icon name="check" className="mr-2 h-4 w-4" />
                            {t("approve")}
                          </DropdownMenuItem>
                        )}
                        {client.approvalStatus === "APPROVED" && (
                          <DropdownMenuItem onClick={() => handleReject(client.clientId)}>
                            <Icon name="x" className="mr-2 h-4 w-4" />
                            {t("reject")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => {
                            navigator.clipboard.writeText(client.clientId);
                            showToast(t("client_id_copied"), "success");
                          }}>
                          <Icon name="clipboard" className="mr-2 h-4 w-4" />
                          {t("copy_client_id")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </Dropdown>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyScreen
          Icon="key"
          headline={t("no_oauth_clients")}
          description={t("no_oauth_clients_admin_description")}
          buttonRaw={
            <Button color="primary" StartIcon="plus" onClick={() => setShowAddDialog(true)}>
              {t("add_oauth_client")}
            </Button>
          }
        />
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent
          type="creation"
          title={createdClient ? t("oauth_client_created") : t("add_oauth_client")}
          description={
            createdClient ? t("oauth_client_created_description") : t("add_oauth_client_description")
          }>
          {!createdClient ? (
            <Form form={oAuthForm} handleSubmit={handleAddClient} className="space-y-4">
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
                    oAuthForm.setValue("logo", newLogo);
                  }}
                  imageSrc={logo}
                />
              </div>

              <DialogFooter>
                <DialogClose onClick={handleCloseDialog}>{t("cancel")}</DialogClose>
                <Button type="submit" loading={addMutation.isPending}>
                  {t("add_client")}
                </Button>
              </DialogFooter>
            </Form>
          ) : (
            <div>
              <div className="text-emphasis mb-5 text-xl font-semibold">{createdClient.name}</div>
              <div className="mb-2 font-medium">{t("client_id")}</div>
              <div className="flex">
                <code className="bg-subtle text-default w-full truncate rounded-md rounded-r-none py-[6px] pl-2 pr-2 align-middle font-mono">
                  {createdClient.clientId}
                </code>
                <Tooltip side="top" content={t("copy_to_clipboard")}>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(createdClient.clientId);
                      showToast(t("client_id_copied"), "success");
                    }}
                    type="button"
                    className="rounded-l-none text-base"
                    StartIcon="clipboard">
                    {t("copy")}
                  </Button>
                </Tooltip>
              </div>
              {createdClient.clientSecret && (
                <>
                  <div className="mb-2 mt-4 font-medium">{t("client_secret")}</div>
                  <div className="flex">
                    <code className="bg-subtle text-default w-full truncate rounded-md rounded-r-none py-[6px] pl-2 pr-2 align-middle font-mono">
                      {createdClient.clientSecret}
                    </code>
                    <Tooltip side="top" content={t("copy_to_clipboard")}>
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(createdClient.clientSecret || "");
                          showToast(t("client_secret_copied"), "success");
                        }}
                        type="button"
                        className="rounded-l-none text-base"
                        StartIcon="clipboard">
                        {t("copy")}
                      </Button>
                    </Tooltip>
                  </div>
                  <div className="text-subtle mt-2 text-sm">{t("copy_client_secret_info")}</div>
                </>
              )}
              <DialogFooter className="mt-6">
                <Button onClick={handleCloseDialog}>{t("done")}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
