"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Form, TextField, SelectField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";
import { useForm } from "react-hook-form";

type InviteFormValues = {
  email: string;
  role: MembershipRole.MEMBER | MembershipRole.ADMIN;
};

const getRoleOptions = (t: (key: string) => string) => [
  { label: t("member"), value: MembershipRole.MEMBER },
  { label: t("admin"), value: MembershipRole.ADMIN },
];

export default function OrganizationMembersPage() {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [inviteOpen, setInviteOpen] = useState(false);
  const roleOptions = getRoleOptions(t);

  const { data, isLoading } = trpc.viewer.organizations.listMembers.useQuery({});

  const inviteMutation = trpc.viewer.organizations.inviteMember.useMutation({
    onSuccess: async () => {
      await utils.viewer.organizations.listMembers.invalidate();
      showToast(t("invite_sent"), "success");
      setInviteOpen(false);
      form.reset();
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const removeMutation = trpc.viewer.organizations.removeMember.useMutation({
    onSuccess: async () => {
      await utils.viewer.organizations.listMembers.invalidate();
      showToast(t("member_removed"), "success");
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const roleMutation = trpc.viewer.organizations.updateMemberRole.useMutation({
    onSuccess: async () => {
      await utils.viewer.organizations.listMembers.invalidate();
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const form = useForm<InviteFormValues>({
    defaultValues: { email: "", role: MembershipRole.MEMBER },
  });

  const members = data?.memberships ?? [];

  return (
    <SettingsHeader title={t("members")} description={t("manage_org_members")} borderInShellHeader={true}>
      <div className="border-subtle border-x border-y-0 px-4 py-6 sm:px-6">
        <div className="mb-4 flex justify-end">
          <Button data-testid="invite-member-btn" onClick={() => setInviteOpen(true)}>{t("invite_member")}</Button>
        </div>

        {isLoading ? (
          <p className="text-subtle text-sm">{t("loading")}</p>
        ) : members.length === 0 ? (
          <p className="text-subtle text-sm">{t("no_members_yet")}</p>
        ) : (
          <ul className="divide-subtle divide-y">
            {members.map((m) => (
              <li key={m.user.id} className="flex items-center gap-3 py-3">
                <Avatar
                  alt={m.user.name ?? m.user.email}
                  imageSrc={m.user.avatarUrl ?? undefined}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-default truncate text-sm font-medium">{m.user.name ?? m.user.email}</p>
                  <p className="text-subtle truncate text-xs">{m.user.email}</p>
                </div>
                <SelectField
                  containerClassName="w-28 shrink-0"
                  value={roleOptions.find((o) => o.value === m.role)}
                  options={roleOptions}
                  isDisabled={m.role === MembershipRole.OWNER || roleMutation.isPending}
                  onChange={(opt) => {
                    if (!opt) return;
                    roleMutation.mutate({ userId: m.user.id, role: opt.value });
                  }}
                />
                {m.role !== MembershipRole.OWNER && (
                  <Button
                    data-testid={`remove-member-${m.user.id}`}
                    variant="destructive"
                    size="sm"
                    disabled={removeMutation.isPending}
                    onClick={() => removeMutation.mutate({ userId: m.user.id })}>
                    {t("remove")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader title={t("invite_member")} />
          <Form
            form={form}
            handleSubmit={(values) =>
              inviteMutation.mutate({ email: values.email, role: values.role })
            }>
            <div className="space-y-4 py-2">
              <TextField
                {...form.register("email", { required: true })}
                data-testid="invite-email-input"
                label={t("email_address")}
                placeholder="member@example.com"
                type="email"
              />
              <SelectField
                label={t("role")}
                options={roleOptions}
                value={roleOptions.find((o) => o.value === form.watch("role"))}
                onChange={(opt) => {
                  if (opt) form.setValue("role", opt.value);
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="minimal" onClick={() => setInviteOpen(false)}>
                {t("cancel")}
              </Button>
              <Button data-testid="send-invite-btn" type="submit" loading={inviteMutation.isPending}>
                {t("send_invite")}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </SettingsHeader>
  );
}
