"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import posthog from "posthog-js";
import React, { useEffect, useRef, useState, type FormEvent } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { MembershipRole, CreationSource } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogClose,
  DialogHeader,
} from "@calcom/ui/components/dialog";
import { Label, TextField, TextArea, Form } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { ImageUploader } from "@calcom/ui/components/image-uploader";
import { showToast } from "@calcom/ui/components/toast";

import { revalidateTeamsList } from "@calcom/web/app/(use-page-wrapper)/(main-nav)/teams/actions";
import { EmailInviteForm } from "~/onboarding/components/EmailInviteForm";
import { RoleSelector } from "~/onboarding/components/RoleSelector";
import type { InviteRole } from "~/onboarding/store/onboarding-store";
import { ValidatedTeamSlug } from "~/onboarding/teams/details/validated-team-slug";

type CreateTeamModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type Step = "details" | "invite";

type InviteFormValues = {
  invites: {
    email: string;
    role: InviteRole;
  }[];
};

export function CreateTeamModal({ isOpen, onClose }: CreateTeamModalProps) {
  const { t, i18n } = useLocale();
  const utils = trpc.useUtils();

  // Step state
  const [currentStep, setCurrentStep] = useState<Step>("details");

  // Team details state
  const logoRef = useRef<HTMLInputElement>(null);
  const [teamName, setTeamName] = useState("");
  const [teamSlug, setTeamSlug] = useState("");
  const [teamBio, setTeamBio] = useState("");
  const [teamLogo, setTeamLogo] = useState<string>("");
  const [isSlugValid, setIsSlugValid] = useState(false);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  // Team ID after creation
  const [createdTeamId, setCreatedTeamId] = useState<number | null>(null);

  // Invite state
  const [inviteRole, setInviteRole] = useState<InviteRole>("MEMBER");

  // Mutations
  const createTeamMutation = trpc.viewer.teams.create.useMutation();
  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation();

  const isSubmitting = createTeamMutation.isPending || inviteMemberMutation.isPending;

  // Invite form
  const formSchema = z.object({
    invites: z.array(
      z.object({
        email: z.union([z.literal(""), z.string().email(t("invalid_email_address"))]),
        role: z.enum(["MEMBER", "ADMIN"]),
      })
    ),
  });

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invites: [{ email: "", role: inviteRole }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "invites",
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep("details");
      setTeamName("");
      setTeamSlug("");
      setTeamBio("");
      setTeamLogo("");
      setIsSlugValid(false);
      setIsSlugManuallyEdited(false);
      setCreatedTeamId(null);
      setInviteRole("MEMBER");
      form.reset({ invites: [{ email: "", role: "MEMBER" }] });
    }
  }, [isOpen, form]);

  // Auto-generate slug from team name
  useEffect(() => {
    if (!isSlugManuallyEdited && teamName) {
      const slugifiedName = slugify(teamName);
      setTeamSlug(slugifiedName);
    }
  }, [teamName, isSlugManuallyEdited]);

  const handleSlugChange = (value: string) => {
    setTeamSlug(value);
    setIsSlugManuallyEdited(true);
  };

  const handleLogoChange = (newLogo: string) => {
    if (logoRef.current) {
      logoRef.current.value = newLogo;
    }
    setTeamLogo(newLogo);
  };

  const handleCreateTeam = async (e?: FormEvent) => {
    e?.preventDefault();

    if (!isSlugValid || !teamName || !teamSlug) {
      return;
    }

    posthog.capture("settings_team_modal_details_continue_clicked", {
      has_logo: !!teamLogo,
      has_bio: !!teamBio,
    });

    try {
      const result = await createTeamMutation.mutateAsync({
        name: teamName,
        slug: teamSlug,
        bio: teamBio,
        logo: teamLogo || null,
        isOnboarding: true,
      });

      // If there's a checkout URL, redirect to Stripe payment
      if (result.url && !result.team) {
        window.location.href = result.url;
        return;
      }

      if (result.team) {
        setCreatedTeamId(result.team.id);
        setCurrentStep("invite");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("something_went_wrong");
      showToast(message, "error");
    }
  };

  const handleInviteMembers = async (data: InviteFormValues) => {
    if (!createdTeamId) {
      showToast(t("team_id_missing") || "Team ID is missing", "error");
      return;
    }

    const validInvites = data.invites.filter((invite) => invite.email && invite.email.trim().length > 0);

    try {
      if (validInvites.length > 0) {
        // Group invites by role
        const invitesByRole = validInvites.reduce(
          (acc, invite) => {
            const role = invite.role === "ADMIN" ? MembershipRole.ADMIN : MembershipRole.MEMBER;
            if (!acc[role]) {
              acc[role] = [];
            }
            acc[role].push(invite.email.trim().toLowerCase());
            return acc;
          },
          {} as Record<MembershipRole, string[]>
        );

        // Send invites for each role group
        await Promise.all(
          Object.entries(invitesByRole).map(([role, emails]) =>
            inviteMemberMutation.mutateAsync({
              teamId: createdTeamId,
              usernameOrEmail: emails,
              role: role as MembershipRole,
              language: i18n.language,
              creationSource: CreationSource.WEBAPP,
            })
          )
        );
      }

      // Invalidate caches and close modal
      await revalidateTeamsList();
      await utils.viewer.teams.list.invalidate();
      showToast(t("team_created_successfully") || "Team created successfully!", "success");
      onClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("something_went_wrong") || "Something went wrong";
      showToast(errorMessage, "error");
    }
  };

  const handleSkipInvite = async () => {
    posthog.capture("settings_team_modal_invite_skip_clicked");
    await revalidateTeamsList();
    await utils.viewer.teams.list.invalidate();
    showToast(t("team_created_successfully") || "Team created successfully!", "success");
    onClose();
  };

  const handleCancel = () => {
    posthog.capture("settings_team_modal_cancel_clicked");
    onClose();
  };

  const watchedInvites = form.watch("invites");
  const hasValidInvites = watchedInvites.some((invite) => invite.email && invite.email.trim().length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg" enableOverflow>
        {/* Step indicator */}
        <div className="mb-4 flex items-center justify-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              currentStep === "details"
                ? "bg-emphasis text-emphasis"
                : "bg-success text-inverted"
            }`}>
            {currentStep === "details" ? "1" : <Icon name="check" className="h-4 w-4" />}
          </div>
          <div className="bg-muted h-0.5 w-8" />
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              currentStep === "invite"
                ? "bg-emphasis text-emphasis"
                : "bg-muted text-muted"
            }`}>
            2
          </div>
        </div>

        {currentStep === "details" && (
          <form onSubmit={handleCreateTeam}>
            <DialogHeader
              title={t("create_your_team")}
              subtitle={t("team_onboarding_details_subtitle")}
            />

            <div className="flex flex-col gap-4">
              {/* Team Profile Picture */}
              <div className="flex w-full flex-col gap-2">
                <Label className="text-emphasis text-sm font-medium leading-4">{t("team_logo")}</Label>
                <div className="flex flex-row items-center justify-start gap-2 rtl:justify-end">
                  <div className="relative shrink-0">
                    <Avatar
                      size="lg"
                      imageSrc={teamLogo || undefined}
                      alt={teamName || "Team"}
                      className="border-2 border-white"
                    />
                  </div>
                  <input ref={logoRef} type="hidden" name="logo" id="logo" defaultValue={teamLogo} />
                  <ImageUploader
                    target="avatar"
                    id="team-logo-upload"
                    buttonMsg={t("upload")}
                    handleAvatarChange={handleLogoChange}
                    imageSrc={teamLogo}
                  />
                </div>
                <p className="text-subtle text-xs font-normal leading-3">{t("onboarding_logo_size_hint")}</p>
              </div>

              {/* Team Name */}
              <div className="flex w-full flex-col gap-1.5">
                <Label className="text-emphasis mb-0 text-sm font-medium leading-4">{t("team_name")}</Label>
                <TextField
                  name="name"
                  data-testid="team-name-input"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Acme Inc."
                  className="border-default h-7 rounded-[10px] border px-2 py-1.5 text-sm"
                />
              </div>

              {/* Team Slug */}
              <ValidatedTeamSlug
                value={teamSlug}
                onChange={handleSlugChange}
                onValidationChange={setIsSlugValid}
              />

              {/* Team Bio */}
              <div className="flex w-full flex-col gap-1.5">
                <Label className="text-emphasis mb-0 text-sm font-medium leading-4">{t("team_bio")}</Label>
                <TextArea
                  value={teamBio}
                  onChange={(e) => setTeamBio(e.target.value)}
                  placeholder={t("team_bio_placeholder")}
                  className="border-default max-h-[150px] min-h-[80px] rounded-[10px] border px-2 py-1.5 text-sm"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter showDivider>
              <DialogClose onClick={handleCancel} disabled={isSubmitting}>
                {t("cancel")}
              </DialogClose>
              <Button
                type="submit"
                color="primary"
                disabled={!isSlugValid || !teamName || !teamSlug || isSubmitting}
                loading={isSubmitting}>
                {t("continue")}
              </Button>
            </DialogFooter>
          </form>
        )}

        {currentStep === "invite" && (
          <Form form={form} handleSubmit={handleInviteMembers}>
            <DialogHeader title={t("invite")} subtitle={t("team_invite_subtitle")} />

            <div className="flex w-full flex-col gap-4">
              <EmailInviteForm
                fields={fields}
                append={append}
                remove={remove}
                defaultRole={inviteRole}
                emailPlaceholder="rick@cal.com"
              />

              <RoleSelector
                value={inviteRole}
                onValueChange={(value) => {
                  setInviteRole(value);
                  fields.forEach((_, index) => {
                    form.setValue(`invites.${index}.role`, value);
                  });
                }}
                showInfoBadge
              />
            </div>

            <DialogFooter showDivider>
              <Button
                type="button"
                color="minimal"
                onClick={handleSkipInvite}
                disabled={isSubmitting}
                data-testid="skip-invite-button">
                {t("onboarding_skip_for_now")}
              </Button>
              <Button
                type="submit"
                color="primary"
                disabled={!hasValidInvites || isSubmitting}
                loading={isSubmitting}>
                {t("continue")}
              </Button>
            </DialogFooter>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
