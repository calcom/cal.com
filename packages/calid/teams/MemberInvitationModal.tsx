"use client";

import React, { useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { CreationSource, MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";

import { Button } from "@calid/features/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@calid/features/ui/components/dialog";
import { Label } from "@calid/features/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@calid/features/ui/components/select";
import { TextField } from "@calid/features/ui/components/text_field";
import { Form } from "@calid/features/ui/components/form";
import { toast } from "@calid/features/ui/components/toast/use-toast";
import { ToggleGroup } from "@calid/features/ui/components/toggle-group";
import { Textarea } from "@calid/features/ui/components/textarea";

type InviteFormValues = {
  emailOrUsername: string;
  role: MembershipRole;
};

type MemberInvitationModalProps = {
  isOpen: boolean;
  teamId: number;
  token?: string;
  isOrg?: boolean;
  isPending?: boolean;
  onExit: () => void;
  onSettingsOpen?: () => void;
  onSubmit: (values: InviteFormValues, reset: () => void) => void;
};

export default function MemberInvitationModal(props: MemberInvitationModalProps) {
  const { t } = useLocale();
  const formMethods = useForm<InviteFormValues>({ defaultValues: { emailOrUsername: "", role: MembershipRole.MEMBER } });

  const resetFields = () => formMethods.reset({ emailOrUsername: "", role: MembershipRole.MEMBER });

  // Modes: individual or bulk import
  type ModalMode = "INDIVIDUAL" | "BULK";
  const [mode, setMode] = useState<ModalMode>("INDIVIDUAL");
  const [bulkEmails, setBulkEmails] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const parseEmailsFromText = (text: string) => {
    const emailRegex = /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
    const matches = text.match(emailRegex) || [];
    const normalized = matches.map((e) => e.trim().toLowerCase());
    // de-duplicate
    return Array.from(new Set(normalized));
  };

  const handleFileUpload: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const contents = String(ev.target?.result || "");
      setBulkEmails(parseEmailsFromText(contents));
    };
    reader.readAsText(file);
  };

  const roleOptions = useMemo(
    () => [
      { label: t("member"), value: MembershipRole.MEMBER },
      { label: t("admin"), value: MembershipRole.ADMIN },
      { label: t("owner"), value: MembershipRole.OWNER },
    ],
    [t]
  );

  // Copy invite link
  const createInvite = trpc.viewer.teams.createInvite.useMutation();
  const handleCopyInviteLink = async () => {
    try {
      const data = await createInvite.mutateAsync({ teamId: props.teamId, token: props.token });
      if (data?.inviteLink) {
        await navigator.clipboard.writeText(data.inviteLink);
        toast({ title: t("copied"), description: t("invite_link_copied") });
      } else {
        toast({ title: t("error"), description: t("something_went_wrong"), variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: t("error"), description: String(err?.message || err), variant: "destructive" });
    }
  };

  const handleSubmit = (values: InviteFormValues) => {
    const payload: InviteFormValues =
      mode === "BULK" ? { role: values.role, emailOrUsername: bulkEmails as unknown as any } : values;
    props.onSubmit(payload, () => {
      resetFields();
      setBulkEmails([]);
      setMode("INDIVIDUAL");
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  return (
    <Dialog open={props.isOpen} onOpenChange={(open) => !open && props.onExit()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("invite_members")}</DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <ToggleGroup
            isFullWidth
            defaultValue={mode}
            value={mode}
            onValueChange={(val) => setMode((val as ModalMode) || "INDIVIDUAL")}
            options={[
              { value: "INDIVIDUAL", label: t("invite_team_individual_segment") },
              { value: "BULK", label: t("invite_team_bulk_segment") },
            ]}
          />
        </div>

        <Form form={formMethods} handleSubmit={handleSubmit}>
          <div className="space-y-6 py-2">
            <Controller
              name="emailOrUsername"
              control={formMethods.control}
              rules={{ required: t("enter_email") as unknown as string }}
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <div>
                  {mode === "INDIVIDUAL" ? (
                    <>
                      <TextField
                        label={t("email")}
                        id="inviteUser"
                        name="inviteUser"
                        placeholder="email@example.com"
                        required
                        value={value}
                        onChange={(e) => onChange(e.target.value.trim().toLowerCase())}
                      />
                      {error && <span className="text-sm text-red-700">{error.message}</span>}
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label>{t("upload_csv")}</Label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleFileUpload}
                        className="text-sm"
                      />
                      <Label className="mt-2">{t("or_paste_emails")}</Label>
                      <Textarea
                        placeholder={t("paste_emails_comma_separated")}
                        onChange={(e) => setBulkEmails(parseEmailsFromText(e.target.value))}
                      />
                      <div className="text-subtle text-xs">{t("selected_count", { count: bulkEmails.length })}</div>
                    </div>
                  )}
                </div>
              )}
            />

            <div>
              <Label className="mb-2 block text-sm font-medium">{t("invite_as")}</Label>
              <Controller
                name="role"
                control={formMethods.control}
                render={({ field: { value, onChange } }) => (
                  <Select value={value} onValueChange={(v) => onChange(v as MembershipRole)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("select_role")} />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <DialogFooter className="justify-between">
            <div className="flex items-center gap-2">
              <Button color="secondary" type="button" onClick={handleCopyInviteLink} loading={createInvite.isPending}>
                {t("copy_invite_link")}
              </Button>
              {props.onSettingsOpen && (
                <Button color="minimal" type="button" onClick={props.onSettingsOpen}>
                  {t("link_settings")}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button color="secondary" type="button" onClick={props.onExit}>
                {t("cancel")}
              </Button>
              <Button color="primary" type="submit" disabled={props.isPending || (mode === "BULK" && bulkEmails.length === 0)}>
                {t("send_invite")}
              </Button>
            </div>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export const MemberInvitationModalWithoutMembers = ({
  hideInvitationModal,
  showMemberInvitationModal,
  teamId,
  token,
  onSettingsOpen,
}: {
  hideInvitationModal: () => void;
  showMemberInvitationModal: boolean;
  teamId: number;
  token?: string;
  onSettingsOpen: () => void;
}) => {
  const { t, i18n } = useLocale();
  const utils = trpc.useUtils();
  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation();

  return (
    <MemberInvitationModal
      isPending={inviteMemberMutation.isPending}
      isOpen={showMemberInvitationModal}
      teamId={teamId}
      token={token}
      onExit={hideInvitationModal}
      onSubmit={(values, resetFields) => {
        inviteMemberMutation.mutate(
          {
            teamId,
            language: i18n.language,
            role: values.role,
            usernameOrEmail: values.emailOrUsername,
            creationSource: CreationSource.WEBAPP,
          },
          {
            onSuccess: async (data) => {
              await Promise.all([
                utils.viewer.teams.get.invalidate(),
                utils.viewer.teams.listMembers.invalidate(),
                utils.viewer.organizations.getMembers.invalidate(),
              ]);
              hideInvitationModal();

              if (Array.isArray(data.usernameOrEmail)) {
                toast({ title: t("invites_sent"), description: t("email_invite_team_bulk", { userCount: data.numUsersInvited }) });
                resetFields();
              } else {
                toast({ title: t("invite_sent"), description: t("email_invite_team", { email: data.usernameOrEmail }) });
              }
            },
            onError: (error) => {
              toast({ title: t("error"), description: error.message, variant: "destructive" });
            },
          }
        );
      }}
      onSettingsOpen={() => {
        hideInvitationModal();
        onSettingsOpen();
      }}
    />
  );
};


