"use client";

import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@calid/features/ui/components/dialog";
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
  teamName,
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

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting: formIsSubmitting },
    reset,
    watch,
  } = useForm<InviteMemberFormData>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      importType: "individual",
      email: "",
      emails: "",
      role: CalIdMembershipRole.MEMBER,
    },
  });

  const selectedRole = watch("role");
  const selectedImportType = watch("importType");
  const emailsText = watch("emails");

  const emailCount =
    selectedImportType === "bulk" && emailsText
      ? emailsText.split(/[,;\n]/).filter((email) => email.trim().length > 0).length
      : 0;

  // Get current user's role to determine what roles they can assign
  const { data: teamData } = trpc.viewer.calidTeams.get.useQuery({ teamId }, { enabled: !!teamId });

  const currentUserRole = teamData?.membership?.role;
  const canAssignOwnerRole = currentUserRole === CalIdMembershipRole.OWNER;
  const canAssignAdminRole =
    currentUserRole === CalIdMembershipRole.OWNER || currentUserRole === CalIdMembershipRole.ADMIN;

  // Role options based on current user's permissions
  // Since only admins/owners can access this modal, we can simplify the logic
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

  // Invite member mutation
  const inviteMemberMutation = trpc.viewer.calidTeams.inviteMember.useMutation({
    onSuccess: () => {
      setIsSubmitting(false);
      setIsOpen(false);
      reset();

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

    if (!isValid) {
      triggerToast("Please fix the form errors before submitting", "error");
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

  const handleClose = () => {
    if (!isSubmitting) {
      setIsOpen(false);
      reset();
    }
  };

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
        <DialogHeader>
          <DialogTitle>{t("invite_team_member")}</DialogTitle>
          <DialogDescription>{t("invite_team_member_description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Import Type Selection */}
          <div className="">
            <label className="text-sm font-medium text-gray-700">{t("import_type")}</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex cursor-pointer items-center space-x-3 rounded-md border p-3 transition-colors ${
                  selectedImportType === "individual"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                <input
                  type="radio"
                  value="individual"
                  {...register("importType")}
                  className="h-4 w-4 border-gray-300 text-blue-600"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">Individual Import</span>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-center space-x-3 rounded-md border p-3 transition-colors ${
                  selectedImportType === "bulk"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                <input
                  type="radio"
                  value="bulk"
                  {...register("importType")}
                  className="h-4 w-4 border-gray-300 text-blue-600"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">Bulk Import</span>
                </div>
              </label>
            </div>
          </div>

          {/* Email Input - Individual */}
          {selectedImportType === "individual" && (
            <div className="space-y-2">
              <TextField
                {...register("email")}
                name="email"
                label="Email Address"
                placeholder="Enter email address"
                type="email"
                error={errors.email?.message}
                required
              />
            </div>
          )}

          {/* Email Input - Bulk */}
          {selectedImportType === "bulk" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email Addresses</label>
              <TextArea
                {...register("emails")}
                name="emails"
                placeholder={t("enter_email_addresses_separated_by_commas_semicolons_or_new_lines")}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                rows={6}
                required
              />
              {errors.emails && <p className="text-sm text-red-600">{errors.emails.message}</p>}
              <div className="flex items-center justify-between">
                {emailCount > 0 && (
                  <p className="text-subtle text-xs font-medium">
                    {emailCount} email{emailCount !== 1 ? "s" : ""} will be invited
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Role Selection */}
          <div className="">
            <label className="text-sm font-medium text-gray-700">{t("team_role")}</label>
            <div className="space-y-2">
              {roleOptions.map((role) => (
                <label
                  key={role.value}
                  className={`flex cursor-pointer items-center space-x-3 rounded-md border p-3 transition-colors ${
                    selectedRole === role.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  } ${role.disabled ? "cursor-not-allowed opacity-50" : ""}`}>
                  <input
                    type="radio"
                    value={role.value}
                    {...register("role")}
                    disabled={role.disabled}
                    className="h-4 w-4 border-gray-300 text-blue-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{role.label}</span>
                      {role.disabled && (
                        <span className="text-xs text-gray-500">Requires higher permissions</span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {errors.role && <p className="text-sm text-red-600">{errors.role.message}</p>}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="button"
              color="minimal"
              onClick={handleClose}
              disabled={isSubmitting}>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="button" color="primary" disabled={isSubmitting}>
              {t("send_invitation")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
