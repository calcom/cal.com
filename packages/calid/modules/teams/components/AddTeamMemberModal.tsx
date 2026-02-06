"use client";

import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@calid/features/ui/components/dialog";
import { Form, FormField } from "@calid/features/ui/components/form/form";
import { TextField } from "@calid/features/ui/components/input/input";
import { TextArea } from "@calid/features/ui/components/input/text-area";
import { triggerToast } from "@calid/features/ui/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useState } from "react";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { CalIdMembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { RadioField, RadioGroup } from "@calcom/ui/components/radio";

const inviteMemberSchema = z
  .object({
    importType: z.enum(["individual", "bulk"]),
    email: z.string().optional(),
    emails: z.string().optional(),
    role: z.nativeEnum(CalIdMembershipRole),
  })
  .refine(
    (data) => {
      if (data.importType === "individual") {
        return data.email && data.email.length > 0;
      } else {
        return data.emails && data.emails.length > 0;
      }
    },
    {
      message: "Please provide email(s) based on the selected import type",
      path: ["email", "emails"],
    }
  )
  .refine(
    (data) => {
      if (data.importType === "bulk" && data.emails) {
        const emails = data.emails
          .split(/[,;\n]/)
          .map((email) => email.trim())
          .filter((email) => email.length > 0);

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emails.every((email) => emailRegex.test(email));
      }
      return true;
    },
    {
      message: "Please ensure all email addresses are valid",
      path: ["emails"],
    }
  );

type InviteMemberFormData = z.infer<typeof inviteMemberSchema>;

interface AddTeamMemberModalProps {
  teamId: number;
  teamName?: string;
  onSuccess?: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const AddTeamMemberModal = ({
  teamId,
  teamName: _teamName,
  onSuccess,
  isOpen: externalIsOpen,
  onOpenChange,
}: AddTeamMemberModalProps) => {
  const { t, i18n } = useLocale();
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;

  const form = useForm<InviteMemberFormData>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      importType: "individual",
      email: "",
      emails: "",
      role: CalIdMembershipRole.MEMBER,
    },
  });

  const selectedImportType = form.watch("importType");
  const emailsText = form.watch("emails");

  const emailCount =
    selectedImportType === "bulk" && emailsText
      ? emailsText.split(/[,;\n]/).filter((email) => email.trim().length > 0).length
      : 0;

  const { data: teamData } = trpc.viewer.calidTeams.get.useQuery({ teamId }, { enabled: !!teamId });

  const currentUserRole = teamData?.membership?.role;
  const canAssignOwnerRole = currentUserRole === CalIdMembershipRole.OWNER;
  const canAssignAdminRole =
    currentUserRole === CalIdMembershipRole.OWNER || currentUserRole === CalIdMembershipRole.ADMIN;

  const roleOptions = [
    {
      value: CalIdMembershipRole.MEMBER,
      label: t("member"),
      disabled: false,
    },
    {
      value: CalIdMembershipRole.ADMIN,
      label: t("admin"),
      disabled: !canAssignAdminRole,
    },
    {
      value: CalIdMembershipRole.OWNER,
      label: t("owner"),
      disabled: !canAssignOwnerRole,
    },
  ];

  const inviteMemberMutation = trpc.viewer.calidTeams.inviteMember.useMutation({
    onSuccess: () => {
      setIsSubmitting(false);
      setIsOpen(false);
      form.reset();

      triggerToast(t("team_invite_sent_successfully"), "success");

      utils.viewer.calidTeams.list.invalidate();
      utils.viewer.calidTeams.get.invalidate();

      onSuccess?.();
    },
    onError: (error) => {
      setIsSubmitting(false);
      triggerToast(error.message, "error");
    },
  });

  const onSubmit = async (data: InviteMemberFormData) => {
    if (!session?.user) {
      triggerToast(t("logged_in_to_invite_team_members"), "error");
      return;
    }

    if (isSubmitting || inviteMemberMutation.isPending) {
      return;
    }

    setIsSubmitting(true);

    let usernameOrEmail: string | string[];

    if (data.importType === "individual") {
      usernameOrEmail = data.email || "";
    } else {
      usernameOrEmail = (data.emails || "")
        .split(/[,;\n]/)
        .map((email) => email.trim())
        .filter((email) => email.length > 0);
    }

    await inviteMemberMutation.mutateAsync({
      teamId,
      usernameOrEmail,
      role: data.role,
      language: i18n.language,
    });
  };

  const _handleClose = () => {
    if (!isSubmitting) {
      setIsOpen(false);
      form.reset();
    }
  };

  const isFormSubmitting = isSubmitting || form.formState.isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {externalIsOpen === undefined && (
        <DialogTrigger asChild>
          <Button StartIcon="plus" variant="button">
            {t("add_team_member")}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader showIcon={true} iconName="users" iconVariant="info">
          <DialogTitle>{t("invite_team_member")}</DialogTitle>
          <DialogDescription>{t("invite_team_member_description")}</DialogDescription>
        </DialogHeader>
        <Form form={form} onSubmit={onSubmit} className="space-y-6">
          <FormField
            control={form.control}
            name="importType"
            render={({ field: { value, onChange } }) => (
              <div className="">
                <label className="text-default text-sm font-medium">{t("import_type")}</label>
                <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-2 gap-3 pt-2">
                  <RadioField
                    label={t("individual")}
                    value="individual"
                    disabled={false}
                    id="importType-individual"
                    className="border-default hover:border-emphasis rounded-md border px-2 py-2"
                  />
                  <RadioField
                    label={t("bulk")}
                    value="bulk"
                    disabled={false}
                    id="importType-bulk"
                    className="border-default hover:border-emphasis rounded-md border px-2 py-2"
                  />
                </RadioGroup>
              </div>
            )}
          />

          {selectedImportType === "individual" && (
            <FormField
              control={form.control}
              name="email"
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <div className="space-y-2">
                  <TextField
                    name="email"
                    label="Email Address"
                    placeholder="Enter email address"
                    type="email"
                    value={value ?? ""}
                    onChange={onChange}
                    error={error?.message}
                    required
                  />
                </div>
              )}
            />
          )}

          {selectedImportType === "bulk" && (
            <FormField
              control={form.control}
              name="emails"
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <div className="space-y-2">
                  <label className="text-default text-sm font-medium">{t("email_address")}</label>
                  <TextArea
                    name="emails"
                    placeholder={t("enter_email_addresses_separated_by_commas_semicolons_or_new_lines")}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    rows={6}
                    value={value ?? ""}
                    onChange={onChange}
                    required
                  />
                  {error?.message && <p className="text-sm text-red-600">{error.message}</p>}
                  <div className="flex items-center justify-between">
                    {emailCount > 0 && (
                      <p className="text-subtle text-xs font-medium">
                        {emailCount} email{emailCount !== 1 ? "s" : ""} will be invited
                      </p>
                    )}
                  </div>
                </div>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="role"
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <div className="">
                <label className="text-default text-sm font-medium">{t("team_role")}</label>
                <RadioGroup value={value} onValueChange={onChange} className="space-y-2 pt-2">
                  {roleOptions.map((role) => (
                    <RadioField
                      key={role.value}
                      label={role.label}
                      value={role.value}
                      disabled={role.disabled}
                      id={`role-${role.value}`}
                      className="border-default hover:border-emphasis rounded-md border px-2 py-2"
                    />
                  ))}
                </RadioGroup>
                {error?.message && <p className="text-sm text-red-600">{error.message}</p>}
              </div>
            )}
          />

          <DialogFooter>
            <DialogClose />
            <Button
              StartIcon="send"
              type="submit"
              variant="button"
              color="primary"
              disabled={isFormSubmitting}>
              {t("send_invitation")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
