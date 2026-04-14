import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import {
  BILLING_PLANS,
  BILLING_PRICING,
} from "@calcom/features/ee/billing/constants";
import type { PendingMember } from "@calcom/features/ee/teams/lib/types";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import {
  IS_TEAM_BILLING_ENABLED_CLIENT,
  MAX_NB_INVITES,
} from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/i18n/useLocale";
import { CreationSource, MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { isEmail } from "@calcom/trpc/server/routers/viewer/teams/util";
import { revalidateTeamsList } from "@calcom/web/app/(use-page-wrapper)/(main-nav)/teams/actions";
import { Button } from "@coss/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import { Field, FieldError, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@coss/ui/components/tabs";
import { Textarea } from "@coss/ui/components/textarea";
import { anchoredToastManager, toastManager } from "@coss/ui/components/toast";
import { useCopyToClipboard } from "@coss/ui/hooks/use-copy-to-clipboard";
import {
  BuildingIcon,
  CheckIcon,
  LinkIcon,
  PaperclipIcon,
  UserIcon,
  UsersIcon,
} from "@coss/ui/icons";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";
import type { FormEvent } from "react";
import { useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { formatCents } from "~/billing/lib/plan-data";
import TeamInviteFromOrg from "~/ee/organizations/components/TeamInviteFromOrg";
import InviteLinkSettingsModal from "./InviteLinkSettingsModal";
import { GoogleWorkspaceInviteButton } from "./GoogleWorkspaceInviteButton";

type MemberInvitationModalProps = {
  isOpen: boolean;
  onExit: () => void;
  orgMembers?: RouterOutputs["viewer"]["organizations"]["getMembers"];
  onSubmit: (values: NewMemberForm, resetFields: () => void) => void;
  teamId: number;
  members?: PendingMember[];
  token?: string;
  expiresInDays?: number;
  isPending?: boolean;
  disableCopyLink?: boolean;
  isOrg?: boolean;
  checkMembershipMutation?: boolean;
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

function toggleElementInArray(
  value: string[] | string | undefined,
  element: string
): string[] {
  const array = value ? (Array.isArray(value) ? value : [value]) : [];
  return array.includes(element)
    ? array.filter((item) => item !== element)
    : [...array, element];
}

const EXPIRES_DAYS_LABELS: Record<number, string> = {
  1: "one_day",
  7: "seven_days",
  30: "thirty_days",
};

function getExpiresLabel(days: number | undefined): string {
  if (days === undefined) return "never_expires";
  return EXPIRES_DAYS_LABELS[days] ?? "thirty_days";
}

export default function MemberInvitationModal(
  props: MemberInvitationModalProps
) {
  const { t } = useLocale();
  const { disableCopyLink = false, isOrg = false } = props;
  const trpcContext = trpc.useUtils();
  const session = useSession();
  const { data: currentOrg } = trpc.viewer.organizations.listCurrent.useQuery(
    undefined,
    {
      enabled: !!session.data?.user?.org,
    }
  );

  const checkIfMembershipExistsMutation =
    trpc.viewer.teams.checkIfMembershipExists.useMutation();

  // Fetch billing info to show dynamic seat price (only for standalone teams, not orgs)
  // Gate with props.isOpen to avoid firing query when modal is mounted but not visible
  const showBillingInfo = !!IS_TEAM_BILLING_ENABLED_CLIENT && !isOrg;
  const { data: subscriptionStatus } =
    trpc.viewer.teams.getSubscriptionStatus.useQuery(
      { teamId: props.teamId },
      { enabled: showBillingInfo && props.isOpen }
    );
  const billingPeriodKey =
    subscriptionStatus?.billingPeriod === "ANNUALLY" ? "annual" : "monthly";
  const seatPrice = `${formatCents(BILLING_PRICING[BILLING_PLANS.TEAMS][billingPeriodKey])}/mo`;

  // Check current org role and not team role
  const isOrgAdminOrOwner =
    currentOrg && checkAdminOrOwner(currentOrg.user.role);

  const canSeeOrganization = currentOrg?.isPrivate
    ? isOrgAdminOrOwner
    : !!(
        props?.orgMembers &&
        props.orgMembers?.length > 0 &&
        isOrgAdminOrOwner
      );

  const [modalImportMode, setModalInputMode] = useState<ModalMode>(
    canSeeOrganization ? "ORGANIZATION" : "INDIVIDUAL"
  );
  const [showInviteLinkSettings, setShowInviteLinkSettings] = useState(false);
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const anchoredToastIdRef = useRef<string | null>(null);
  const copyToastTimeout = 2000;

  const { copyToClipboard, isCopied } = useCopyToClipboard({
    onCopy: () => {
      if (copyButtonRef.current) {
        anchoredToastIdRef.current = anchoredToastManager.add({
          data: { tooltipStyle: true },
          positionerProps: { anchor: copyButtonRef.current },
          timeout: copyToastTimeout,
          title: t("invite_link_copied"),
        });
      }
    },
    timeout: copyToastTimeout,
  });

  const createInviteMutation = trpc.viewer.teams.createInvite.useMutation({
    async onSuccess() {
      trpcContext.viewer.teams.get.invalidate();
      trpcContext.viewer.teams.list.invalidate();
      revalidateTeamsList();
    },
    onError: (error) => {
      toastManager.add({ title: error.message, type: "error" });
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

  const inviteModeTabs = useMemo(() => {
    const array = [
      {
        value: "INDIVIDUAL",
        label: t("invite_team_individual_segment"),
        icon: <UserIcon aria-hidden="true" />,
      },
      {
        value: "BULK",
        label: t("invite_team_bulk_segment"),
        icon: <UsersIcon aria-hidden="true" />,
      },
    ];
    if (canSeeOrganization) {
      array.unshift({
        value: "ORGANIZATION",
        label: t("organization"),
        icon: <BuildingIcon aria-hidden="true" />,
      });
    }
    return array;
  }, [t, canSeeOrganization]);

  const newMemberFormMethods = useForm<NewMemberForm>();

  const checkIfMembershipExists = (value: string) => {
    if (props.checkMembershipMutation) {
      return checkIfMembershipExistsMutation.mutateAsync({
        teamId: props.teamId,
        value,
      });
    } else {
      if (!props?.members?.length) return false;
      return (
        props?.members.some((member) => member?.username === value) ||
        props?.members.some((member) => member?.email === value)
      );
    }
  };

  const handleFileUpload = (e: FileEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) {
      return;
    }
    const file = e.target.files[0];

    if (file) {
      const reader = new FileReader();
      const emailRegex =
        /^([A-Z0-9_+-]+\.?)*[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i;
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
    setModalInputMode(canSeeOrganization ? "ORGANIZATION" : "INDIVIDUAL");
  };

  const importRef = useRef<HTMLInputElement | null>(null);

  return (
    <Dialog
      open={props.isOpen}
      onOpenChange={(open) => {
        if (!open) {
          props.onExit();
        }
      }}
      onOpenChangeComplete={(open) => {
        if (!open) {
          resetFields();
        }
      }}
    >
      <DialogPopup className="max-w-xl" bottomStickOnMobile={false}>
        <DialogHeader>
          <DialogTitle>{t("invite_team_member")}</DialogTitle>
          {showBillingInfo ? (
            <DialogDescription>
              <ServerTrans
                t={t}
                i18nKey="invite_new_member_description"
                values={{ price: seatPrice }}
                components={[
                  <span
                    key="invite_new_member_description"
                    className="font-medium text-foreground"
                  />,
                ]}
              />
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <form
          className="contents"
          onSubmit={newMemberFormMethods.handleSubmit((values) => {
            props.onSubmit(values, resetFields);
            posthog.capture("teams_modal_invite_members_button_clicked");
          })}
        >
          <DialogPanel>
            <Tabs
              className="gap-6"
              value={modalImportMode}
              onValueChange={(val) => {
                setModalInputMode(val as ModalMode);
                newMemberFormMethods.clearErrors();
              }}
            >
              <TabsList className="w-full" aria-label={t("import_mode")}>
                {inviteModeTabs.map((tab) => (
                  <TabsTab key={tab.value} value={tab.value}>
                    <span className="max-sm:hidden">{tab.icon}</span>
                    <span className="max-sm:text-sm">{tab.label}</span>
                  </TabsTab>
                ))}
              </TabsList>
              <TabsPanel value="INDIVIDUAL">
                <Controller
                  name="emailOrUsername"
                  control={newMemberFormMethods.control}
                  rules={{
                    required: t("enter_email"),
                    validate: async (value) => {
                      // orgs can only invite members by email
                      if (typeof value === "string" && !isEmail(value))
                        return t("enter_email");
                      if (typeof value === "string") {
                        const doesInviteExists = await checkIfMembershipExists(
                          value
                        );
                        return !doesInviteExists || t("member_already_invited");
                      }
                    },
                  }}
                  render={({
                    field: { ref, name, value, onBlur, onChange },
                    fieldState: { invalid, error },
                  }) => (
                    <Field name={name} invalid={invalid}>
                      <FieldLabel>{t("email")}</FieldLabel>
                      <Input
                        type="email"
                        value={typeof value === "string" ? value : ""}
                        placeholder="email@example.com"
                        required
                        ref={ref}
                        onBlur={onBlur}
                        onValueChange={(nextValue) =>
                          onChange(nextValue.trim().toLowerCase())
                        }
                      />
                      <FieldError match={!!error}>{error?.message}</FieldError>
                    </Field>
                  )}
                />
              </TabsPanel>
              <TabsPanel value="BULK">
                <div className="flex flex-col gap-2 p-4 rounded-xl bg-muted">
                  <Controller
                    name="emailOrUsername"
                    control={newMemberFormMethods.control}
                    rules={{
                      required: t("enter_email"),
                      validate: (value) => {
                        if (
                          Array.isArray(value) &&
                          value.some((email) => !isEmail(email))
                        )
                          return t("enter_emails");
                        if (
                          Array.isArray(value) &&
                          value.length > MAX_NB_INVITES
                        )
                          return t("too_many_invites", {
                            nbUsers: MAX_NB_INVITES,
                          });
                        if (typeof value === "string" && !isEmail(value))
                          return t("enter_email");
                      },
                    }}
                    render={({
                      field: { ref, name, value, onBlur, onChange },
                      fieldState: { invalid, error },
                    }) => (
                      <Field name={name} invalid={invalid}>
                        <FieldLabel>{t("invite_via_email")}</FieldLabel>
                        <Textarea
                          autoCorrect="off"
                          placeholder="john@doe.com, alex@smith.com"
                          required
                          ref={ref}
                          onBlur={onBlur}
                          value={
                            Array.isArray(value)
                              ? value.join(", ")
                              : value ?? ""
                          }
                          onChange={(e) => {
                            const targetValues = e.target.value.split(/[\n,]/);
                            const emails =
                              targetValues.length === 1
                                ? targetValues[0].trim().toLocaleLowerCase()
                                : targetValues.map((email) =>
                                    email.trim().toLocaleLowerCase()
                                  );

                            return onChange(emails);
                          }}
                        />
                        <FieldError match={!!error}>
                          {error?.message}
                        </FieldError>
                      </Field>
                    )}
                  />

                  <GoogleWorkspaceInviteButton
                    onSuccess={(data) => {
                      newMemberFormMethods.setValue("emailOrUsername", data);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (importRef.current) {
                        importRef.current.click();
                      }
                    }}
                  >
                    <PaperclipIcon aria-hidden="true" />
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
              </TabsPanel>
              <TabsPanel value="ORGANIZATION">
                <Controller
                  name="emailOrUsername"
                  control={newMemberFormMethods.control}
                  rules={{
                    required: t("enter_email_or_username"),
                  }}
                  render={({ field: { onChange, value } }) => (
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
                  )}
                />
              </TabsPanel>
            </Tabs>

            <div className="flex flex-col gap-6 mt-6">
              <Controller
                name="role"
                control={newMemberFormMethods.control}
                defaultValue={options[0].value}
                render={({ field: { name, value, onChange } }) => (
                  <Field name={name}>
                    <FieldLabel>{t("invite_as")}</FieldLabel>
                    <Select
                      items={options}
                      value={value}
                      onValueChange={(newValue) => {
                        if (newValue) onChange(newValue as MembershipRole);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </Field>
                )}
              />
              {(!disableCopyLink || props.token) && (
                <div className="flex flex-col gap-2">
                  {!disableCopyLink && (
                    <Button
                      ref={copyButtonRef}
                      type="button"
                      variant="outline"
                      className="gap-2 w-fit"
                      disabled={isCopied || createInviteMutation.isPending}
                      onClick={async () => {
                        try {
                          const { inviteLink } =
                            await createInviteMutation.mutateAsync({
                              teamId: props.teamId,
                              token: props.token,
                            });
                          copyToClipboard(inviteLink);
                        } catch (e) {
                          toastManager.add({
                            title: t("something_went_wrong_on_our_end"),
                            type: "error",
                          });
                          console.error(e);
                        }
                      }}
                      data-testid="copy-invite-link-button"
                    >
                      {isCopied ? (
                        <CheckIcon aria-hidden />
                      ) : (
                        <LinkIcon aria-hidden />
                      )}
                      {t("copy_invite_link")}
                    </Button>
                  )}
                  {(!disableCopyLink || props.token) && (
                    <div className="text-xs text-muted-foreground">
                      <span>
                        {props.token
                          ? getExpiresLabel(props.expiresInDays) ===
                            "never_expires"
                            ? t("never_expires")
                            : `${t("link_expires_after")} ${t(
                                getExpiresLabel(props.expiresInDays)
                              )}`
                          : `${t("link_expires_after")} ${t("seven_days")}`}
                      </span>
                      {props.token && (
                        <>
                          {" "}
                          <span aria-hidden="true">·</span>{" "}
                          <button
                            type="button"
                            className="font-medium cursor-pointer text-foreground underline-offset-4 hover:underline"
                            onClick={() => {
                              if (anchoredToastIdRef.current) {
                                anchoredToastManager.close(
                                  anchoredToastIdRef.current
                                );
                                anchoredToastIdRef.current = null;
                              }
                              setShowInviteLinkSettings(true);
                            }}
                            data-testid="edit-invite-link-button"
                          >
                            {t("edit_invite_link")}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogPanel>
          <DialogFooter>
            <DialogClose
              render={<Button variant="ghost">{t("cancel")}</Button>}
            />
            <Button
              type="submit"
              variant="default"
              loading={props.isPending}
              disabled={
                props.isPending ||
                createInviteMutation.isPending ||
                checkIfMembershipExistsMutation.isPending
              }
              data-testid="invite-new-member-button"
            >
              {t("send_invite")}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
      {props.token && (
        <InviteLinkSettingsModal
          isOpen={showInviteLinkSettings}
          teamId={props.teamId}
          token={props.token}
          expiresInDays={props.expiresInDays}
          onExit={() => setShowInviteLinkSettings(false)}
        />
      )}
    </Dialog>
  );
}

export const MemberInvitationModalWithoutMembers = ({
  hideInvitationModal,
  showMemberInvitationModal,
  teamId,
  token,
  expiresInDays,
  ...props
}: Partial<MemberInvitationModalProps> & {
  hideInvitationModal: () => void;
  showMemberInvitationModal: boolean;
  teamId: number;
  token?: string;
  expiresInDays?: number;
}) => {
  const searchParams = useCompatSearchParams();
  const { t, i18n } = useLocale();
  const utils = trpc.useUtils();

  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation();

  const { data: orgMembersNotInThisTeam, isPending: isOrgListLoading } =
    trpc.viewer.organizations.getMembers.useQuery(
      {
        teamIdToExclude: teamId,
        distinctUser: true,
      },
      {
        enabled:
          searchParams !== null && !!teamId && !!showMemberInvitationModal,
      }
    );

  return (
    <MemberInvitationModal
      {...props}
      isPending={inviteMemberMutation.isPending || isOrgListLoading}
      isOpen={showMemberInvitationModal}
      orgMembers={orgMembersNotInThisTeam}
      teamId={teamId}
      token={token}
      expiresInDays={expiresInDays}
      onExit={hideInvitationModal}
      checkMembershipMutation={true}
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
              await utils.viewer.teams.get.invalidate();
              await utils.viewer.teams.listMembers.invalidate();
              await utils.viewer.organizations.getMembers.invalidate();
              revalidateTeamsList();
              hideInvitationModal();

              if (Array.isArray(data.usernameOrEmail)) {
                toastManager.add({
                  title: t("email_invite_team_bulk", {
                    userCount: data.numUsersInvited,
                  }),
                  type: "success",
                });
                resetFields();
              } else {
                toastManager.add({
                  title: t("email_invite_team", {
                    email: data.usernameOrEmail,
                  }),
                  type: "success",
                });
              }
            },
            onError: (error) => {
              toastManager.add({ title: error.message, type: "error" });
            },
          }
        );
      }}
    />
  );
};
