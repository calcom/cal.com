import { PaperclipIcon, UserIcon, Users } from "lucide-react";
import { Trans } from "next-i18next";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import {
  Button,
  Checkbox as CheckboxField,
  Dialog,
  DialogContent,
  DialogFooter,
  Form,
  TextField,
  Label,
  ToggleGroup,
  Select,
  TextAreaField,
} from "@calcom/ui";

import type { PendingMember } from "../lib/types";
import { GoogleWorkspaceInviteButton } from "./GoogleWorkspaceInviteButton";

type MemberInvitationModalProps = {
  isOpen: boolean;
  onExit: () => void;
  onSubmit: (values: NewMemberForm) => void;
  members: PendingMember[];
};

type MembershipRoleOption = {
  value: MembershipRole;
  label: string;
};

export interface NewMemberForm {
  emailOrUsername: string | string[];
  role: MembershipRole;
  sendInviteEmail: boolean;
}

type ModalMode = "INDIVIDUAL" | "BULK";

export default function MemberInvitationModal(props: MemberInvitationModalProps) {
  const { t } = useLocale();
  const [modalImportMode, setModalInputMode] = useState<ModalMode>("INDIVIDUAL");
  const options: MembershipRoleOption[] = useMemo(() => {
    return [
      { value: MembershipRole.MEMBER, label: t("member") },
      { value: MembershipRole.ADMIN, label: t("admin") },
      { value: MembershipRole.OWNER, label: t("owner") },
    ];
  }, [t]);

  const newMemberFormMethods = useForm<NewMemberForm>();

  const validateUniqueInvite = (value: string) => {
    return !(
      props.members.some((member) => member?.username === value) ||
      props.members.some((member) => member?.email === value)
    );
  };

  return (
    <Dialog
      name="inviteModal"
      open={props.isOpen}
      onOpenChange={() => {
        props.onExit();
        newMemberFormMethods.reset();
      }}>
      <DialogContent
        type="creation"
        title={t("invite_team_member")}
        description={
          IS_TEAM_BILLING_ENABLED ? (
            <span className="text-subtle text-sm leading-tight">
              <Trans i18nKey="invite_new_member_description">
                Note: This will <span className="text-emphasis font-medium">cost an extra seat ($15/m)</span>{" "}
                on your subscription.
              </Trans>
            </span>
          ) : null
        }>
        <div>
          <Label className="sr-only" htmlFor="role">
            {t("import_mode")}
          </Label>
          <ToggleGroup
            isFullWidth={true}
            onValueChange={(val) => setModalInputMode(val as ModalMode)}
            defaultValue="INDIVIDUAL"
            options={[
              {
                value: "INDIVIDUAL",
                label: t("invite_team_individual_segment"),
                iconLeft: <UserIcon />,
              },
              { value: "BULK", label: t("invite_team_bulk_segment"), iconLeft: <Users /> },
            ]}
          />
        </div>

        <Form form={newMemberFormMethods} handleSubmit={(values) => props.onSubmit(values)}>
          <div className="space-y-6">
            {/* Indivdual Invite */}
            {modalImportMode === "INDIVIDUAL" && (
              <Controller
                name="emailOrUsername"
                control={newMemberFormMethods.control}
                rules={{
                  required: t("enter_email_or_username"),
                  validate: (value) => {
                    if (typeof value === "string")
                      return validateUniqueInvite(value) || t("member_already_invited");
                  },
                }}
                render={({ field: { onChange }, fieldState: { error } }) => (
                  <>
                    <TextField
                      label={t("email_or_username")}
                      id="inviteUser"
                      name="inviteUser"
                      placeholder="email@example.com"
                      required
                      onChange={(e) => onChange(e.target.value.trim().toLowerCase())}
                    />
                    {error && <span className="text-sm text-red-800">{error.message}</span>}
                  </>
                )}
              />
            )}
            {/* Bulk Invite */}
            {modalImportMode === "BULK" && (
              <div className="bg-muted flex flex-col rounded-md p-4">
                <Controller
                  name="emailOrUsername"
                  control={newMemberFormMethods.control}
                  rules={{
                    required: t("enter_email_or_username"),
                  }}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <>
                      {/* TODO: Make this a fancy email input that styles on a successful email. */}
                      <TextAreaField
                        name="emails"
                        label="Invite via email"
                        rows={4}
                        autoCorrect="off"
                        placeholder="john@doe.com, alex@smith.com"
                        required
                        value={value}
                        onChange={(e) => {
                          const emails = e.target.value
                            .split(",")
                            .map((email) => email.trim().toLocaleLowerCase());

                          return onChange(emails);
                        }}
                      />
                      {error && <span className="text-sm text-red-800">{error.message}</span>}
                    </>
                  )}
                />

                <GoogleWorkspaceInviteButton
                  onSuccess={(data) => {
                    newMemberFormMethods.setValue("emailOrUsername", data);
                  }}
                />
                <Button
                  disabled
                  type="button"
                  color="secondary"
                  StartIcon={PaperclipIcon}
                  className="mt-3 justify-center stroke-2">
                  Upload a .csv file
                </Button>
              </div>
            )}
            <Controller
              name="role"
              control={newMemberFormMethods.control}
              defaultValue={options[0].value}
              render={({ field: { onChange } }) => (
                <div>
                  <Label className="text-emphasis font-medium" htmlFor="role">
                    {t("invite_as")}
                  </Label>
                  <Select
                    id="role"
                    defaultValue={options[0]}
                    options={options}
                    onChange={(val) => {
                      if (val) onChange(val.value);
                    }}
                  />
                </div>
              )}
            />
            <Controller
              name="sendInviteEmail"
              control={newMemberFormMethods.control}
              defaultValue={true}
              render={() => (
                <CheckboxField
                  className="mr-0"
                  defaultChecked={true}
                  description={t("send_invite_email")}
                  onChange={(e) => newMemberFormMethods.setValue("sendInviteEmail", e.target.checked)}
                />
              )}
            />
          </div>
          <DialogFooter showDivider>
            <Button
              type="button"
              color="minimal"
              onClick={() => {
                props.onExit();
                newMemberFormMethods.reset();
              }}>
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              color="primary"
              className="ms-2 me-2"
              data-testid="invite-new-member-button">
              {t("send_invite")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
