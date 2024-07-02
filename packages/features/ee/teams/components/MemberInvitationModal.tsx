import { useSession } from "next-auth/react";
import { Trans } from "next-i18next";
import type { FormEvent } from "react";
import { useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import TeamInviteFromOrg from "@calcom/ee/organizations/components/TeamInviteFromOrg";
import { classNames } from "@calcom/lib";
import { IS_TEAM_BILLING_ENABLED, MAX_NB_INVITES } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc";
import { isEmail } from "@calcom/trpc/server/routers/viewer/teams/util";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  Form,
  Icon,
  Label,
  Select,
  showToast,
  TextAreaField,
  TextField,
  ToggleGroup,
} from "@calcom/ui";

import type { PendingMember } from "../lib/types";
import { GoogleWorkspaceInviteButton } from "./GoogleWorkspaceInviteButton";

type MemberInvitationModalProps = {
  isOpen: boolean;
  justEmailInvites?: boolean;
  onExit: () => void;
  orgMembers?: RouterOutputs["viewer"]["organizations"]["getMembers"];
  onSubmit: (values: NewMemberForm, resetFields: () => void) => void;
  onSettingsOpen?: () => void;
  teamId: number;
  members?: PendingMember[];
  token?: string;
  isPending?: boolean;
  disableCopyLink?: boolean;
  isOrg?: boolean;
};

type MembershipRoleOption = {
  value: MembershipRole;
  label: string;
};

export interface NewMemberForm {
  emailOrUsername: string | string[];
  role: MembershipRole;
}

type ModalMode = "INDIVIDUAL" | "BULK" | "ORGANIZATION";

interface FileEvent<T = Element> extends FormEvent<T> {
  target: EventTarget & T;
}

function toggleElementInArray(value: string[] | string | undefined, element: string): string[] {
  const array = value ? (Array.isArray(value) ? value : [value]) : [];
  return array.includes(element) ? array.filter((item) => item !== element) : [...array, element];
}

export default function MemberInvitationModal(props: MemberInvitationModalProps) {
  const { t } = useLocale();
  const { disableCopyLink = false, isOrg = false } = props;
  const trpcContext = trpc.useUtils();
  const session = useSession();
  const { data: currentOrg } = trpc.viewer.organizations.listCurrent.useQuery(undefined, {
    enabled: !!session.data?.user?.org,
  });

  // Check current org role and not team role
  const isOrgAdminOrOwner =
    currentOrg &&
    (currentOrg.user.role === MembershipRole.OWNER || currentOrg.user.role === MembershipRole.ADMIN);

  const canSeeOrganization = !!(
    props?.orgMembers &&
    props.orgMembers?.length > 0 &&
    currentOrg?.isPrivate &&
    isOrgAdminOrOwner
  );

  const [modalImportMode, setModalInputMode] = useState<ModalMode>(
    canSeeOrganization ? "ORGANIZATION" : "INDIVIDUAL"
  );

  const createInviteMutation = trpc.viewer.teams.createInvite.useMutation({
    async onSuccess({ inviteLink }) {
      trpcContext.viewer.teams.get.invalidate();
      trpcContext.viewer.teams.list.invalidate();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const options: MembershipRoleOption[] = useMemo(() => {
    const options: MembershipRoleOption[] = [
      { value: MembershipRole.MEMBER, label: t("member") },
      { value: MembershipRole.ADMIN, label: t("admin") },
      { value: MembershipRole.OWNER, label: t("owner") },
    ];

    // Adjust options for organizations where the user isn't the owner
    if (isOrg && !isOrgAdminOrOwner) {
      return options.filter((option) => option.value !== MembershipRole.OWNER);
    }

    return options;
  }, [t, isOrgAdminOrOwner, isOrg]);

  const toggleGroupOptions = useMemo(() => {
    const array = [
      {
        value: "INDIVIDUAL",
        label: t("invite_team_individual_segment"),
        iconLeft: <Icon name="user" />,
      },
      { value: "BULK", label: t("invite_team_bulk_segment"), iconLeft: <Icon name="users" /> },
    ];
    if (canSeeOrganization) {
      array.unshift({
        value: "ORGANIZATION",
        label: t("organization"),
        iconLeft: <Icon name="building" />,
      });
    }
    return array;
  }, [t, canSeeOrganization]);

  const newMemberFormMethods = useForm<NewMemberForm>();

  const validateUniqueInvite = (value: string) => {
    if (!props?.members?.length) return true;
    return !(
      props?.members.some((member) => member?.username === value) ||
      props?.members.some((member) => member?.email === value)
    );
  };

  const handleFileUpload = (e: FileEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) {
      return;
    }
    const file = e.target.files[0];

    if (file) {
      const reader = new FileReader();
      const emailRegex = /^([A-Z0-9_+-]+\.?)*[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i;
      reader.onload = (e) => {
        const contents = e?.target?.result as string;
        const lines = contents.split("\n");
        const validEmails = [];
        for (const line of lines) {
          const columns = line.split(/,|;|\|| /);
          for (const column of columns) {
            const email = column.trim().toLowerCase();

            if (emailRegex.test(email)) {
              validEmails.push(email);
              break; // Stop checking columns if a valid email is found in this line
            }
          }
        }

        newMemberFormMethods.setValue("emailOrUsername", validEmails);
      };

      reader.readAsText(file);
    }
  };

  const resetFields = () => {
    newMemberFormMethods.reset();
    newMemberFormMethods.setValue("emailOrUsername", "");
    newMemberFormMethods.setValue("role", options[0].value);
    setModalInputMode("INDIVIDUAL");
  };

  const importRef = useRef<HTMLInputElement | null>(null);

  return (
    <Dialog
      name="inviteModal"
      open={props.isOpen}
      onOpenChange={() => {
        props.onExit();
        newMemberFormMethods.reset();
      }}>
      <DialogContent
        enableOverflow
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
            onValueChange={(val) => {
              setModalInputMode(val as ModalMode);
              newMemberFormMethods.clearErrors();
            }}
            defaultValue={modalImportMode}
            options={toggleGroupOptions}
          />
        </div>

        <Form form={newMemberFormMethods} handleSubmit={(values) => props.onSubmit(values, resetFields)}>
          <div className="mb-10 mt-6 space-y-6">
            {/* Indivdual Invite */}
            {modalImportMode === "INDIVIDUAL" && (
              <Controller
                name="emailOrUsername"
                control={newMemberFormMethods.control}
                rules={{
                  required: isOrg ? t("enter_email") : t("enter_email_or_username"),
                  validate: (value) => {
                    // orgs can only invite members by email
                    if (typeof value === "string" && isOrg && !isEmail(value)) return t("enter_email");
                    if (typeof value === "string")
                      return validateUniqueInvite(value) || t("member_already_invited");
                  },
                }}
                render={({ field: { onChange }, fieldState: { error } }) => (
                  <>
                    <TextField
                      label={props.justEmailInvites ? t("email") : t("email_or_username")}
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
                    required: t("enter_email"),
                    validate: (value) => {
                      if (Array.isArray(value) && value.some((email) => !isEmail(email)))
                        return t("enter_emails");
                      if (Array.isArray(value) && value.length > MAX_NB_INVITES)
                        return t("too_many_invites", { nbUsers: MAX_NB_INVITES });
                      if (typeof value === "string" && !isEmail(value)) return t("enter_email");
                    },
                  }}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <>
                      {/* TODO: Make this a fancy email input that styles on a successful email. */}
                      <TextAreaField
                        name="emails"
                        label={t("invite_via_email")}
                        rows={4}
                        autoCorrect="off"
                        placeholder="john@doe.com, alex@smith.com"
                        required
                        value={value}
                        onChange={(e) => {
                          const targetValues = e.target.value.split(/[\n,]/);
                          const emails =
                            targetValues.length === 1
                              ? targetValues[0].trim().toLocaleLowerCase()
                              : targetValues.map((email) => email.trim().toLocaleLowerCase());

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
                  type="button"
                  color="secondary"
                  onClick={() => {
                    if (importRef.current) {
                      importRef.current.click();
                    }
                  }}
                  StartIcon="paperclip"
                  className="mt-3 justify-center stroke-2">
                  {t("upload_csv_file")}
                </Button>
                <input
                  ref={importRef}
                  hidden
                  id="bulkInvite"
                  type="file"
                  accept=".csv"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
              </div>
            )}
            {modalImportMode === "ORGANIZATION" && (
              <Controller
                name="emailOrUsername"
                control={newMemberFormMethods.control}
                rules={{
                  required: t("enter_email_or_username"),
                }}
                render={({ field: { onChange, value } }) => (
                  <>
                    <TeamInviteFromOrg
                      selectedEmails={value}
                      handleOnChecked={(userEmail) => {
                        // If 'value' is not an array, create a new array with 'userEmail' to allow future updates to the array.
                        // If 'value' is an array, update the array by either adding or removing 'userEmail'.
                        const newValue = toggleElementInArray(value, userEmail);
                        onChange(newValue);
                      }}
                      orgMembers={props.orgMembers}
                    />
                  </>
                )}
              />
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
            {props.token && (
              <div className="flex">
                <Button
                  type="button"
                  color="minimal"
                  className="me-2 ms-2"
                  onClick={() => {
                    props.onSettingsOpen && props.onSettingsOpen();
                    newMemberFormMethods.reset();
                  }}
                  data-testid="edit-invite-link-button">
                  {t("edit_invite_link")}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter showDivider>
            {!disableCopyLink && (
              <div className="flex-grow">
                <Button
                  type="button"
                  color="minimal"
                  variant="icon"
                  onClick={async function () {
                    try {
                      // Required for Safari but also works on Chrome
                      // Credits to https://wolfgangrittner.dev/how-to-use-clipboard-api-in-firefox/
                      if (typeof ClipboardItem !== "undefined") {
                        const inviteLinkClipbardItem = new ClipboardItem({
                          "text/plain": new Promise(async (resolve) => {
                            // Instead of doing async work and then writing to clipboard, do async work in clipboard API itself
                            const { inviteLink } = await createInviteMutation.mutateAsync({
                              teamId: props.teamId,
                              token: props.token,
                            });
                            showToast(t("invite_link_copied"), "success");
                            resolve(new Blob([inviteLink], { type: "text/plain" }));
                          }),
                        });
                        await navigator.clipboard.write([inviteLinkClipbardItem]);
                      } else {
                        // Fallback for browsers that don't support ClipboardItem e.g. Firefox
                        const { inviteLink } = await createInviteMutation.mutateAsync({
                          teamId: props.teamId,
                          token: props.token,
                        });
                        await navigator.clipboard.writeText(inviteLink);
                        showToast(t("invite_link_copied"), "success");
                      }
                    } catch (e) {
                      showToast(t("something_went_wrong_on_our_end"), "error");
                      console.error(e);
                    }
                  }}
                  className={classNames("gap-2", props.token && "opacity-50")}
                  data-testid="copy-invite-link-button">
                  <Icon name="link" className="text-default h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{t("copy_invite_link")}</span>
                </Button>
              </div>
            )}
            <Button
              type="button"
              color="minimal"
              onClick={() => {
                props.onExit();
                resetFields();
              }}>
              {t("cancel")}
            </Button>
            <Button
              loading={props.isPending || createInviteMutation.isPending}
              type="submit"
              color="primary"
              className="me-2 ms-2"
              data-testid="invite-new-member-button">
              {t("send_invite")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
