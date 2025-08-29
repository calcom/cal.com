import { useSession } from "next-auth/react";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { CreationSource } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import { isEmail } from "@calcom/trpc/server/routers/viewer/teams/util";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { Form } from "@calcom/ui/components/form";
import { Label } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import usePlatformMe from "@calcom/web/components/settings/platform/hooks/usePlatformMe";

import type { UserTableAction } from "./types";

interface Props {
  dispatch: React.Dispatch<UserTableAction>;
}

type MembershipRoleOption = {
  value: MembershipRole;
  label: string;
};

interface UserInvitation {
  email: string;
  role: MembershipRole;
}

interface FormValues {
  defaultRole: MembershipRole;
}

export function ImportMembersModal(props: Props) {
  const { data: session } = useSession();
  const { data: platformUser } = usePlatformMe();
  const utils = trpc.useUtils();
  const { t, i18n } = useLocale();
  const [parsedUsers, setParsedUsers] = useState<UserInvitation[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation({
    onSuccess: (data) => {
      props.dispatch({ type: "CLOSE_MODAL" });
      utils.viewer.organizations.listMembers.invalidate();
      
     
      if (data.numExistingUsersUpdated && data.numExistingUsersUpdated > 0) {
        showToast(
          t("email_invite_team_bulk_with_updates", { 
            userCount: data.numUsersInvited,
            updatedCount: data.numExistingUsersUpdated 
          }), 
          "success"
        );
      } else {
        showToast(t("email_invite_team_bulk", { userCount: data.numUsersInvited }), "success");
      }
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const form = useForm<FormValues>({
    defaultValues: {
      defaultRole: MembershipRole.MEMBER,
    },
  });

  const orgId = session?.user.org?.id ?? platformUser?.organizationId;
  if (!orgId) return null;

  const roleOptions: MembershipRoleOption[] = [
    { value: MembershipRole.MEMBER, label: t("member") },
    { value: MembershipRole.ADMIN, label: t("admin") },
    { value: MembershipRole.OWNER, label: t("owner") },
  ];

  const handleFileUpload = (files: FileList | null) => {
    if (!files?.length) {
      return;
    }

    setParseError(null);
    setParsedUsers([]);

    const file = files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const contents = e?.target?.result as string;
        const lines = contents.split("\n");

        const headers = lines[0].split(",");
        const emailIndex = headers.findIndex((h) => h.trim().toLowerCase() === "members");
        const roleIndex = headers.findIndex((h) => h.trim().toLowerCase() === "role");

        if (emailIndex === -1) {
          throw new Error(t("csv_file_must_have_members_column"));
        }

        const users: UserInvitation[] = [];

        // Start from index 1 to skip header row
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const columns = line.split(",");
          const email = columns[emailIndex]?.trim();

          if (!email || !isEmail(email)) {
            continue;
          }

          let role = form.getValues("defaultRole");
          if (roleIndex !== -1 && columns[roleIndex]) {
            const roleValue = columns[roleIndex].trim().toUpperCase();
            if (Object.values(MembershipRole).includes(roleValue as MembershipRole)) {
              role = roleValue as MembershipRole;
            }
          }

          users.push({ email, role });
        }

        if (users.length === 0) {
          throw new Error(t("no_valid_email_addresses_found"));
        }
        setParsedUsers(users);
      } catch (error) {
        setParseError((error as Error).message);
      }
    };

    reader.readAsText(file);
  };

  const handleSubmit = () => {
    if (parsedUsers.length === 0) {
      return;
    }

    inviteMemberMutation.mutateAsync({
      teamId: orgId,
      usernameOrEmail: parsedUsers,
      language: i18n.language,
      isPlatform: platformUser?.organization.isPlatform,
      creationSource: CreationSource.WEBAPP,
    });
  };

  const resetForm = () => {
    form.reset();
    setParsedUsers([]);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog
      name="importModal"
      open={true}
      onOpenChange={() => {
        props.dispatch({ type: "CLOSE_MODAL" });
        resetForm();
      }}>
      <DialogContent enableOverflow type="creation" title={t("import_team_members")}>
        <Form form={form} handleSubmit={handleSubmit}>
          <div className="mb-10 space-y-6">
            {parsedUsers.length === 0 && (
              <Controller
                name="defaultRole"
                control={form.control}
                render={({ field: { onChange, value } }) => (
                  <div>
                    <Label className="text-emphasis font-medium" htmlFor="defaultRole">
                      {t("default_role_for_imported_users")}
                    </Label>
                    <Select
                      id="role"
                      defaultValue={roleOptions[0]}
                      options={roleOptions}
                      onChange={(val) => {
                        if (val) onChange(val.value);
                      }}
                    />
                    <p className="text-subtle mt-2 text-sm">{t("role_applied_if_not_specified_in_csv")}</p>
                  </div>
                )}
              />
            )}

            {parsedUsers.length > 0 && (
              <div>
                <div className="mt-2 max-h-60 overflow-y-auto rounded-md border p-2">
                  <table className="w-full">
                    <thead>
                      <tr className="text-subtle border-b text-sm">
                        <th className="pb-2 text-left">{t("email")}</th>
                        <th className="pb-2 text-left">{t("role")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedUsers.map((user, index) => (
                        <tr key={index} className="border-b last:border-b-0">
                          <td className="py-2">{user.email}</td>
                          <td className="py-2">
                            <Badge variant={user.role === "MEMBER" ? "gray" : "blue"} className="capitalize">
                              {user.role.toLowerCase()}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="bg-muted mt-4 rounded-md p-4">
              <div className="flex items-center">
                <Icon name="info" className="text-subtle mr-2 h-4 w-4" />
                <p className="text-subtle text-sm">{t("csv_format_info")}</p>
              </div>
              <div className="mt-2">
                <p className="text-subtle text-sm">
                  {t("required_columns")}: <code className="text-xs">Members</code>
                </p>
                <p className="text-subtle text-sm">
                  {t("optional_columns")}: <code className="text-xs">Role</code> ({t("values")}: MEMBER,
                  ADMIN, OWNER)
                </p>
              </div>
              <div className="mt-2">
                <p className="text-subtle text-sm">{t("example")}:</p>
                <pre className="bg-subtle mt-1 rounded p-2 text-xs">
                  Members,Role{"\n"}
                  john@example.com,MEMBER,{"\n"}
                  jane@example.com,ADMIN
                </pre>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <div className="flex items-center">
                <Button
                  type="button"
                  color="secondary"
                  className="w-full justify-center stroke-2"
                  StartIcon="paperclip"
                  onClick={() => fileInputRef.current?.click()}>
                  {t("upload_csv_file")}
                </Button>
                <input
                  id="csvFile"
                  name="csvFile"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </div>
              {parseError && <p className="text-sm text-red-800">{parseError}</p>}
            </div>
          </div>

          <DialogFooter showDivider>
            <Button
              type="button"
              color="minimal"
              onClick={() => {
                props.dispatch({ type: "CLOSE_MODAL" });
                resetForm();
              }}>
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              loading={inviteMemberMutation.isPending}
              disabled={parsedUsers.length === 0}>
              {t("send_invite")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
