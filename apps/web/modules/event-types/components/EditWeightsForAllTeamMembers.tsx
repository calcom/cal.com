"use client";

import { useTeamMembersWithSegmentPlatform } from "@calcom/atoms/event-types/hooks/useTeamMembersWithSegmentPlatform";
import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import type { Host, TeamMember } from "@calcom/features/eventtypes/lib/types";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { downloadAsCsv } from "@calcom/lib/csvUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AttributesQueryValue } from "@calcom/lib/raqb/types";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button, buttonClasses } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@calcom/ui/components/sheet";
import { showToast } from "@calcom/ui/components/toast";
import { useTeamMembersWithSegment } from "@calcom/web/modules/event-types/hooks/useTeamMembersWithSegment";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type TeamMemberItemProps = {
  member: Omit<TeamMember, "defaultScheduleId"> & { weight?: number };
  onWeightChange: (memberId: string, weight: number) => void;
};

const TeamMemberItem = ({ member, onWeightChange }: TeamMemberItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  return (
    <div className="border-subtle flex h-12 items-center border-b px-3 py-1 last:border-b-0">
      <Avatar size="sm" imageSrc={member.avatar} alt={member.label} className="min-w-10" />
      <span className="text-emphasis ml-3 grow text-sm">{member.label}</span>
      <div className="ml-auto flex h-full items-center">
        {isEditing ? (
          <div className="flex h-full items-center">
            <div className="relative flex h-full items-center">
              <input
                ref={inputRef}
                type="number"
                min="0"
                inputMode="numeric"
                className="bg-cal-muted border-default text-emphasis h-7 w-12 rounded-l-sm border px-2 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                defaultValue={member.weight ?? 100}
                onBlur={(e) => {
                  const newWeight = parseInt(e.target.value);
                  if (!isNaN(newWeight)) {
                    onWeightChange(member.value, newWeight);
                  }
                  setIsEditing(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const input = e.target as HTMLInputElement;
                    const newWeight = parseInt(input.value);
                    if (!isNaN(newWeight)) {
                      onWeightChange(member.value, newWeight);
                    }
                    setIsEditing(false);
                  }
                  if (e.key === "Escape") {
                    setIsEditing(false);
                  }
                }}
              />
              <span className="text-default border-default bg-cal-muted flex h-7 items-center rounded-r-sm border border-l-0 px-2 text-sm">
                %
              </span>
            </div>
          </div>
        ) : (
          <button
            className="text-emphasis hover:bg-subtle decoration-emphasis flex h-7 items-center rounded-sm px-2 text-sm underline underline-offset-4"
            onClick={() => setIsEditing(true)}>
            {member.weight ?? 100}%
          </button>
        )}
      </div>
    </div>
  );
};

interface Props {
  teamMembers: TeamMember[];
  value: Host[];
  onChange: (hosts: Host[]) => void;
  assignRRMembersUsingSegment: boolean;
  teamId?: number;
  queryValue?: AttributesQueryValue | null;
}

export const EditWeightsForAllTeamMembers = ({
  teamMembers: initialTeamMembers,
  value,
  onChange,
  assignRRMembersUsingSegment,
  teamId,
  queryValue,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");

  const isPlatform = useIsPlatform();

  const useTeamMembersHook = isPlatform ? useTeamMembersWithSegmentPlatform : useTeamMembersWithSegment;

  const { teamMembers, localWeightsInitialValues } = useTeamMembersHook({
    initialTeamMembers,
    assignRRMembersUsingSegment,
    teamId,
    queryValue,
    value,
  });

  const [localWeights, setLocalWeights] = useState<Record<string, number>>(localWeightsInitialValues);
  const [uploadErrors, setUploadErrors] = useState<Array<{ email: string; error: string }>>([]);
  const [isErrorsExpanded, setIsErrorsExpanded] = useState(true);

  const handleWeightChange = (memberId: string, weight: number) => {
    setLocalWeights((prev) => ({ ...prev, [memberId]: weight }));
  };

  const handleSave = () => {
    // Create a map of existing hosts for easy lookup
    const existingHostsMap = new Map(
      value.filter((host) => !host.isFixed).map((host) => [host.userId.toString(), host])
    );

    // Create the updated value by processing all team members
    const updatedValue = teamMembers
      .map((member) => {
        const existingHost = existingHostsMap.get(member.value);
        if (!existingHost) return null;
        return {
          ...existingHost,
          userId: parseInt(member.value, 10),
          isFixed: existingHost?.isFixed ?? false,
          priority: existingHost?.priority ?? 0,
          weight: localWeights[member.value] ?? existingHost?.weight ?? 100,
          groupId: existingHost?.groupId ?? null,
        };
      })
      .filter(Boolean) as Host[];

    onChange(updatedValue);
    setIsOpen(false);
  };

  const handleDownloadCsv = () => {
    const csvData = teamMembers.map((member) => ({
      id: member.value,
      name: member.label,
      email: member.email,
      weight: localWeights[member.value] ?? 100,
    }));
    downloadAsCsv(csvData, "team-members-weights.csv");
  };

  const handleUploadCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      if (!event.target?.result) return;

      const csvData = event.target.result as string;
      const lines = csvData.split("\n");
      const newWeights: Record<string, number> = { ...localWeights };
      const newErrors: Array<{ email: string; error: string }> = [];

      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const [, , email, weightStr] = line.split(",");
        if (!email || !weightStr) continue;

        const member = teamMembers.find((m) => m.email === email);
        if (!member) {
          newErrors.push({ email, error: t("member_not_found") });
          continue;
        }

        const weight = parseInt(weightStr);
        if (isNaN(weight) || weight <= 0) {
          newErrors.push({ email, error: t("invalid_weight") });
          continue;
        }

        newWeights[member.value] = weight;
      }

      setLocalWeights(newWeights);
      setUploadErrors(newErrors);

      if (newErrors.length > 0) {
        showToast(t("weights_updated_with_errors", { count: newErrors.length }), "warning");
      } else {
        showToast(t("weights_updated_from_csv"), "success");
      }
      e.target.value = "";
    };

    reader.readAsText(file);
  };

  const filteredMembers = useMemo(() => {
    return teamMembers
      .map((member) => ({
        ...member,
        weight: localWeights[member.value],
      }))
      .filter(
        (member) =>
          member.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .filter((member) => {
        return value.some((host) => !host.isFixed && host.userId === parseInt(member.value, 10));
      });
  }, [teamMembers, localWeights, searchQuery, value]);

  return (
    <>
      <Button
        color="secondary"
        className="-ml-2 -mt-2 mb-2 w-fit"
        onClick={() => {
          setIsOpen(true);
        }}>
        {t("edit_team_member_weights")}
      </Button>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <form className="flex h-full flex-col">
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{t("edit_team_member_weights")}</SheetTitle>
              <div className="text-subtle text-sm">
                <ServerTrans
                  t={t}
                  i18nKey="weights_description"
                  components={[
                    <Link
                      key="weights_description"
                      className="underline underline-offset-2"
                      target="_blank"
                      href="https://cal.com/docs/enterprise-features/teams/round-robin-scheduling#weights">
                      Learn more
                    </Link>,
                  ]}
                />
              </div>
            </SheetHeader>

            <SheetBody className="mt-4 flex h-full flex-col stack-y-6 p-1">
              <div className="flex justify-start gap-2">
                <label className={buttonClasses({ color: "secondary" })}>
                  <Icon name="upload" className="mr-2 h-4 w-4" />
                  <input type="file" accept=".csv" className="hidden" onChange={handleUploadCsv} />
                  {t("upload")}
                </label>
                <Button color="secondary" StartIcon="download" onClick={handleDownloadCsv}>
                  {t("download")}
                </Button>
              </div>
              <TextField
                placeholder={t("search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
                addOnLeading={
                  <Icon name="search" className="text-subtle h-4 w-4" aria-hidden="true" focusable="false" />
                }
              />

              <div className="flex max-h-[80dvh] flex-col overflow-y-auto rounded-md border">
                {filteredMembers.map((member) => (
                  <TeamMemberItem key={member.value} member={member} onWeightChange={handleWeightChange} />
                ))}
                {filteredMembers.length === 0 && (
                  <div className="text-subtle py-4 text-center text-sm">{t("no_members_found")}</div>
                )}
              </div>

              {uploadErrors.length > 0 && (
                <div className="mt-4">
                  <button
                    className="flex w-full items-center justify-between rounded-md border bg-red-50 p-3 text-sm text-red-900"
                    onClick={() => setIsErrorsExpanded(!isErrorsExpanded)}>
                    <div className="flex items-center space-x-2">
                      <Icon name="info" className="h-4 w-4" />
                      <span>{t("csv_upload_errors", { count: uploadErrors.length })}</span>
                    </div>
                    <Icon name="chevron-down" className="h-4 w-4" />
                  </button>
                  {isErrorsExpanded && (
                    <div className="mt-2 stack-y-2">
                      {uploadErrors.map((error, index) => (
                        <div
                          key={index}
                          className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-900">
                          <strong>{error.email}:</strong> {error.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </SheetBody>

            <SheetFooter>
              <SheetClose asChild>
                <Button
                  color="minimal"
                  onClick={() => {
                    // Restore to default weights from the original value
                    setLocalWeights(localWeightsInitialValues);
                    setSearchQuery("");
                  }}>
                  {t("cancel")}
                </Button>
              </SheetClose>
              <Button onClick={handleSave}>{t("done")}</Button>
            </SheetFooter>
          </SheetContent>
        </form>
      </Sheet>
    </>
  );
};
