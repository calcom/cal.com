import { useSession } from "next-auth/react";
import { useState } from "react";

import type { Host, TeamMember } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole, CreationSource } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import { isEmail } from "@calcom/trpc/server/routers/viewer/teams/util";
import { Button } from "@calcom/ui/components/button";
import { TextAreaField } from "@calcom/ui/components/form";
import { ToggleGroup } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

type HostAssignmentMode = "INDIVIDUAL" | "BULK";

interface BulkHostAssignmentProps {
  teamId: number;
  teamMembers: TeamMember[];
  currentHosts: Host[];
  onHostsChange: (hosts: Host[]) => void;
  isFixed: boolean;
  children: React.ReactNode;
}

export function BulkHostAssignment({
  teamId,
  teamMembers,
  currentHosts,
  onHostsChange,
  isFixed,
  children,
}: BulkHostAssignmentProps) {
  const { t } = useLocale();
  const session = useSession();
  const [assignmentMode, setAssignmentMode] = useState<HostAssignmentMode>("INDIVIDUAL");
  const [bulkInput, setBulkInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation({
    onSuccess: (data) => {
      if (Array.isArray(data.usernameOrEmail)) {
        showToast(
          t("email_invite_team_bulk", {
            userCount: data.numUsersInvited,
          }),
          "success"
        );
      } else {
        showToast(t("email_invite_team", { email: data.usernameOrEmail }), "success");
      }
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const toggleGroupOptions = [
    {
      value: "INDIVIDUAL",
      label: t("individual"),
      iconLeft: <Icon name="user" />,
    },
    {
      value: "BULK",
      label: t("bulk"),
      iconLeft: <Icon name="users" />,
    },
  ];

  const processBulkInput = async () => {
    if (!bulkInput.trim()) return;

    setIsProcessing(true);
    try {
      const lines = bulkInput
        .split(/[\n,;]/)
        .map((line) => line.trim())
        .filter((line) => line);
      const validEmails: string[] = [];
      const newHosts: Host[] = [...currentHosts];
      const invalidEntries: string[] = [];

      lines.forEach((line) => {
        if (isEmail(line)) {
          validEmails.push(line.toLowerCase());
        } else if (line.length > 0) {
          const existingMember = teamMembers.find(
            (member) =>
              member.label.toLowerCase().includes(line.toLowerCase()) ||
              member.value.toLowerCase() === line.toLowerCase()
          );
          if (existingMember) {
            const isAlreadySelected = currentHosts.find(
              (host) => host.userId.toString() === existingMember.value
            );
            if (!isAlreadySelected) {
              const newHost: Host = {
                userId: parseInt(existingMember.value, 10),
                priority: 2,
                weight: 100,
                isFixed,
                scheduleId: existingMember.defaultScheduleId,
              };
              newHosts.push(newHost);
            }
          } else {
            invalidEntries.push(line);
          }
        }
      });

      if (newHosts.length > currentHosts.length) {
        onHostsChange(newHosts);
      }

      if (validEmails.length > 0) {
        await inviteMemberMutation.mutateAsync({
          teamId,
          usernameOrEmail: validEmails,
          role: MembershipRole.MEMBER,
          language: session.data?.user?.locale || "en",
          creationSource: CreationSource.WEBAPP,
        });
      }

      if (invalidEntries.length > 0) {
        showToast(t("some_entries_could_not_be_added", { entries: invalidEntries.join(", ") }), "warning");
      }

      setBulkInput("");
      setAssignmentMode("INDIVIDUAL");
    } catch (error) {
      console.error("Error processing bulk input:", error);
      showToast(t("error_processing_bulk_input"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="mb-4">
        <ToggleGroup
          isFullWidth={true}
          className="flex-col sm:flex-row"
          onValueChange={(val) => setAssignmentMode(val as HostAssignmentMode)}
          defaultValue={assignmentMode}
          options={toggleGroupOptions}
        />
      </div>

      {assignmentMode === "INDIVIDUAL" ? (
        children
      ) : (
        <div className="bg-muted flex flex-col rounded-md p-4">
          <TextAreaField
            name="bulkHostInput"
            label={t("bulk_add_hosts")}
            rows={4}
            placeholder={t("bulk_add_hosts_placeholder")}
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
          />
          <Button
            type="button"
            color="primary"
            className="mt-3 justify-center"
            onClick={processBulkInput}
            loading={isProcessing || inviteMemberMutation.isPending}
            disabled={!bulkInput.trim()}>
            {t("add_hosts")}
          </Button>
        </div>
      )}
    </div>
  );
}
