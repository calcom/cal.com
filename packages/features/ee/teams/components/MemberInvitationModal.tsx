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

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clip-path="url(#clip0_4178_176214)">
      <path
        d="M8.31875 15.36C4.26 15.36 0.9575 12.0588 0.9575 8.00001C0.9575 3.94126 4.26 0.640015 8.31875 0.640015C10.1575 0.640015 11.9175 1.32126 13.2763 2.55876L13.5238 2.78501L11.0963 5.21251L10.8713 5.02001C10.1588 4.41001 9.2525 4.07376 8.31875 4.07376C6.15375 4.07376 4.39125 5.83501 4.39125 8.00001C4.39125 10.165 6.15375 11.9263 8.31875 11.9263C9.88 11.9263 11.1138 11.1288 11.695 9.77001H7.99875V6.45626L15.215 6.46626L15.2688 6.72001C15.645 8.50626 15.3438 11.1338 13.8188 13.0138C12.5563 14.57 10.7063 15.36 8.31875 15.36Z"
        fill="#6B7280"
      />
    </g>
    <defs>
      <clipPath id="clip0_4178_176214">
        <rect width="16" height="16" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

export default function MemberInvitationModal(props: MemberInvitationModalProps) {
  const { t } = useLocale();
  const [modalImportMode, setModalInputMode] = useState<ModalMode>("INDIVIDUAL");
  const options: MembershipRoleOption[] = useMemo(() => {
    return [
      { value: MembershipRole.MEMBER, label: t("member") },
      { value: MembershipRole.ADMIN, label: t("admin") },
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
                  validate: (value) => validateUniqueInvite(value) || t("member_already_invited"),
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
                  render={({ field: { onChange }, fieldState: { error } }) => (
                    <>
                      {/* TODO: Make this a fancy email input that styles on a successful email. */}
                      <TextAreaField
                        name="emails"
                        label="Invite via email"
                        rows={4}
                        autoCorrect="off"
                        placeholder="john@doe.com, alex@smith.com"
                        required
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

                <div className="mt-1 mb-3 flex w-full items-center justify-center">
                  <hr className="border-subtle border-1 h-px w-full" />
                  <span className="bg-muted text-subtle px-2 py-1 leading-none">Or</span>
                  <hr className="border-subtle border-1 h-px w-full" />
                </div>

                <Button
                  type="button"
                  color="secondary"
                  StartIcon={GoogleIcon}
                  className="justify-center gap-2">
                  Import via Google Workspace
                </Button>
                <Button
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
