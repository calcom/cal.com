"use client";

import { useHosts } from "@calcom/features/eventtypes/lib/HostsContext";
import type { Host } from "@calcom/features/eventtypes/lib/types";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { downloadAsCsv } from "@calcom/lib/csvUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AttributesQueryValue } from "@calcom/lib/raqb/types";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button, buttonClasses } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
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
import { ChevronDownIcon, InfoIcon, SearchIcon, UploadIcon } from "@coss/ui/icons";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type WeightMember = {
  value: string;
  label: string;
  avatar: string;
  email: string;
  weight?: number;
};

type TeamMemberItemProps = {
  member: WeightMember;
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
  value: Host[];
  onChange: (hosts: Host[]) => void;
  assignAllTeamMembers: boolean;
  assignRRMembersUsingSegment: boolean;
  eventTypeId: number;
  teamId?: number;
  queryValue?: AttributesQueryValue | null;
}

export const EditWeightsForAllTeamMembers = ({
  value,
  onChange,
  assignAllTeamMembers,
  assignRRMembersUsingSegment,
  eventTypeId,
  teamId,
  queryValue,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");

  // Single query that loads all members — handles assignAllTeamMembers, segment filtering, and assigned hosts
  const { data, isPending: isLoading } = trpc.viewer.eventTypes.exportHostsForWeights.useQuery(
    {
      eventTypeId,
      teamId,
      assignAllTeamMembers,
      assignRRMembersUsingSegment,
      attributesQueryValue: queryValue,
    },
    { enabled: isOpen }
  );
  const allMembers = data?.members ?? [];

  // Build a map of current RR host weights from form state for quick lookup
  const hostWeightsMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const host of value) {
      if (!host.isFixed) {
        map.set(host.userId, host.weight ?? 100);
      }
    }
    return map;
  }, [value]);

  const [localWeights, setLocalWeights] = useState<Record<string, number>>({});
  const [uploadErrors, setUploadErrors] = useState<Array<{ email: string; error: string }>>([]);
  const [isErrorsExpanded, setIsErrorsExpanded] = useState(true);

  // Initialize local weights from host data when sheet opens
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, number> = {};
      for (const host of value) {
        if (!host.isFixed) {
          initial[String(host.userId)] = host.weight ?? 100;
        }
      }
      setLocalWeights(initial);
    }
  }, [isOpen, value]);

  const handleWeightChange = (memberId: string, weight: number) => {
    setLocalWeights((prev) => ({ ...prev, [memberId]: weight }));
  };

  const { updateHost } = useHosts();

  const handleSave = () => {
    const originalWeightMap = new Map<number, number>();
    for (const host of value) {
      if (!host.isFixed) {
        originalWeightMap.set(host.userId, host.weight ?? 100);
      }
    }
    for (const m of allMembers) {
      if (!originalWeightMap.has(m.userId)) {
        originalWeightMap.set(m.userId, m.weight ?? 100);
      }
    }

    for (const [userIdStr, newWeight] of Object.entries(localWeights)) {
      const userId = parseInt(userIdStr, 10);
      const originalWeight = originalWeightMap.get(userId) ?? 100;
      if (newWeight !== originalWeight) {
        updateHost(userId, { weight: newWeight });
      }
    }

    setIsOpen(false);
  };

  const displayMembers = useMemo((): WeightMember[] => {
    let members = allMembers.map((m) => ({
      value: String(m.userId),
      label: m.name || m.email || "",
      avatar: m.avatarUrl || "",
      email: m.email,
      weight: localWeights[String(m.userId)] ?? m.weight ?? hostWeightsMap.get(m.userId) ?? 100,
    }));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      members = members.filter((m) => m.label.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
    }

    return members;
  }, [allMembers, localWeights, hostWeightsMap, searchQuery]);

  const utils = trpc.useUtils();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadCsv = useCallback(async () => {
    setIsDownloading(true);
    try {
      const { members } = await utils.viewer.eventTypes.exportHostsForWeights.fetch({
        eventTypeId,
        teamId,
        assignAllTeamMembers,
        assignRRMembersUsingSegment,
        attributesQueryValue: queryValue,
      });

      downloadAsCsv(
        members.map((m) => ({
          id: m.userId,
          name: m.name || m.email || "",
          email: m.email,
          weight: localWeights[String(m.userId)] ?? m.weight ?? hostWeightsMap.get(m.userId) ?? 100,
        })),
        "team-members-weights.csv"
      );
    } finally {
      setIsDownloading(false);
    }
  }, [
    utils,
    eventTypeId,
    teamId,
    assignAllTeamMembers,
    assignRRMembersUsingSegment,
    queryValue,
    localWeights,
    hostWeightsMap,
  ]);

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

        const member = allMembers.find((m) => m.email === email);
        if (!member) {
          newErrors.push({ email, error: t("member_not_found") });
          continue;
        }

        const weight = parseInt(weightStr);
        if (isNaN(weight) || weight <= 0) {
          newErrors.push({ email, error: t("invalid_weight") });
          continue;
        }

        newWeights[String(member.userId)] = weight;
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
        <div className="flex h-full flex-col">
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

            <SheetBody className="mt-4 flex flex-col stack-y-6 p-1">
              <div className="flex justify-start gap-2">
                <label className={buttonClasses({ color: "secondary" })}>
                  <UploadIcon className="mr-2 h-4 w-4" />
                  <input type="file" accept=".csv" className="hidden" onChange={handleUploadCsv} />
                  {t("upload")}
                </label>
                <Button
                  color="secondary"
                  StartIcon="download"
                  onClick={handleDownloadCsv}
                  loading={isDownloading}
                  disabled={isDownloading}>
                  {t("download")}
                </Button>
              </div>
              <TextField
                placeholder={t("search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                addOnLeading={<SearchIcon className="text-subtle h-4 w-4" />}
              />

              <div className="flex flex-col rounded-md border">
                {displayMembers.map((member) => (
                  <TeamMemberItem key={member.value} member={member} onWeightChange={handleWeightChange} />
                ))}
                {isLoading && <div className="text-subtle py-2 text-center text-sm">{t("loading")}</div>}
                {displayMembers.length === 0 && !isLoading && (
                  <div className="text-subtle py-4 text-center text-sm">{t("no_members_found")}</div>
                )}
              </div>

              {uploadErrors.length > 0 && (
                <div className="mt-4">
                  <button
                    className="flex w-full items-center justify-between rounded-md border bg-red-50 p-3 text-sm text-red-900"
                    onClick={() => setIsErrorsExpanded(!isErrorsExpanded)}>
                    <div className="flex items-center space-x-2">
                      <InfoIcon className="h-4 w-4" />
                      <span>{t("csv_upload_errors", { count: uploadErrors.length })}</span>
                    </div>
                    <ChevronDownIcon className="h-4 w-4" />
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
                    setSearchQuery("");
                  }}>
                  {t("cancel")}
                </Button>
              </SheetClose>
              <Button onClick={handleSave}>{t("done")}</Button>
            </SheetFooter>
          </SheetContent>
        </div>
      </Sheet>
    </>
  );
};
