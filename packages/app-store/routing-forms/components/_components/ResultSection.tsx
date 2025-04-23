"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { NonRouterRoute } from "routing-forms/types/types";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/components/badge";
import type { IconName } from "@calcom/ui/components/icon";
import { Icon } from "@calcom/ui/components/icon";

import type { MembersMatchResultType } from "./TeamMembersMatchResult";

export const ResultsSection = ({
  title,
  children,
  icon,
  hint,
}: {
  title?: string;
  children: ReactNode;
  icon?: IconName;
  hint?: ReactNode;
}) => (
  <div className="bg-default border-muted mb-0.5 flex flex-col gap-0.5 rounded-2xl border p-1">
    {(title || icon) && (
      <div className="flex items-center gap-2 px-2 py-1">
        {icon && (
          <div className="border-subtle rounded-lg border p-1">
            <Icon name={icon} className="h-4 w-4" />
          </div>
        )}
        <h4 className="text-sm font-medium leading-none">{title}</h4>
      </div>
    )}
    <div className="border-subtle rounded-xl border px-3 py-2">{children}</div>
    {hint && hint}
  </div>
);

export const TeamMember = ({ name, email, score }: { name: string | null; email: string; score: number }) => (
  <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
    <div className="aspace-y-2 flex flex-col">
      <h4 className="text-emphasis font-medium">{name || "Nameless User"}</h4>
      <Badge variant="gray">{email}</Badge>
    </div>
    <span
      className={`font-medium ${
        score > 0 ? "text-green-600" : score < 0 ? "text-red-600" : "text-gray-600"
      }`}>
      {score > 0 ? "+" : ""}
      {score}
    </span>
  </div>
);

interface ResultsViewProps {
  onBack: () => void;
  chosenRoute: NonRouterRoute | null;
  supportsTeamMembersMatchingLogic?: boolean;
  membersMatchResult?: MembersMatchResultType | null;
  isPending?: boolean;
  eventTypeUrlWithoutParams?: string;
}

export const ResultsView = ({
  onBack,
  chosenRoute,
  supportsTeamMembersMatchingLogic = false,
  membersMatchResult = null,
  isPending = false,
  eventTypeUrlWithoutParams = "",
}: ResultsViewProps) => {
  const { t } = useLocale();

  if (!chosenRoute) return null;

  if (isPending) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
        className="space-y-4">
        <div className="bg-default border-muted mb-0.5 flex flex-col gap-0.5 rounded-2xl border p-1">
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="border-subtle rounded-lg border p-1">
              <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="border-subtle rounded-xl border px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="border-subtle rounded-lg border p-1">
                <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
              </div>
              <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        </div>

        {supportsTeamMembersMatchingLogic && (
          <>
            <div className="bg-default border-muted mb-0.5 flex flex-col gap-0.5 rounded-2xl border p-1">
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="border-subtle rounded-lg border p-1">
                  <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
                </div>
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              </div>
              <div className="border-subtle rounded-xl border px-3 py-2">
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                      <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-default border-muted mb-0.5 flex flex-col gap-0.5 rounded-2xl border p-1">
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="border-subtle rounded-lg border p-1">
                  <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
                </div>
                <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
              </div>
              <div className="border-subtle rounded-xl border px-3 py-2">
                <div className="divide-subtle divide-y">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="space-y-2">
                        <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                      </div>
                      <div className="h-4 w-8 animate-pulse rounded bg-gray-200" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-4">
      {chosenRoute.action.type === "eventTypeRedirectUrl" && (
        <ResultsSection title={chosenRoute.name ?? ""} icon="zap">
          <div className="flex items-center gap-2">
            <div className="border-subtle rounded-lg border p-1">
              <Icon name="calendar" className="h-4 w-4" />
            </div>
            <span className="text-emphasis text-sm font-medium leading-none">{chosenRoute.action.value}</span>
          </div>
        </ResultsSection>
      )}

      {supportsTeamMembersMatchingLogic && membersMatchResult && (
        <>
          <ResultsSection title="Matching" icon="atom">
            <div className="relative flex flex-col gap-3">
              {/* Seperator */}
              <div className="absolute bottom-3 left-[0.75rem] top-3 w-[1px] bg-gray-200" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <div className="border-subtle z-10 rounded-lg border bg-white p-1">
                    <Icon name="activity" className="h-4 w-4" />
                  </div>
                  <span className="text-emphasis text-sm font-medium leading-none">
                    Attribute logic matched
                  </span>
                </div>
                <Badge variant={membersMatchResult.checkedFallback ? "error" : "success"}>
                  {membersMatchResult.checkedFallback ? "No" : "Yes"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <div className="border-subtle z-10 rotate-180 rounded-lg border bg-white p-1">
                    <Icon name="split" className="h-4 w-4" />
                  </div>
                  <span className="text-emphasis text-sm font-medium leading-none">Attribute fallback</span>
                </div>
                <Badge variant={membersMatchResult.checkedFallback ? "success" : "gray"}>
                  {membersMatchResult.checkedFallback ? "Yes" : "Not needed"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <div className="border-subtle z-10 rounded-lg border bg-white p-1">
                    <Icon name="user" className="h-4 w-4" />
                  </div>
                  <span className="text-emphasis text-sm font-medium leading-none">Contact owner</span>
                </div>
                <Badge variant={membersMatchResult.contactOwnerEmail ? "success" : "gray"}>
                  {membersMatchResult.contactOwnerEmail || "Not found"}
                </Badge>
              </div>
            </div>
          </ResultsSection>

          {membersMatchResult.teamMembersMatchingAttributeLogic && (
            <ResultsSection
              title={`${membersMatchResult.teamMembersMatchingAttributeLogic.length} next in queue`}
              icon="user-check"
              hint={
                <div className="flex items-center gap-2 px-2 py-1">
                  <Icon name="info" className="h-3 w-3" />
                  <span className="text-subtle text-sm">{t("routing_preview_more_info_found_insights")}</span>
                </div>
              }>
              <div className="divide-subtle divide-y">
                {membersMatchResult.teamMembersMatchingAttributeLogic.map((member, index) => (
                  <TeamMember
                    key={member.id}
                    email={member.email}
                    name={member.name}
                    score={membersMatchResult.perUserData?.weights?.[member.id] || 0}
                  />
                ))}
              </div>
            </ResultsSection>
          )}

          {membersMatchResult.mainWarnings && membersMatchResult.mainWarnings.length > 0 && (
            <ResultsSection title="Warnings" icon="triangle-alert">
              <div className="space-y-2">
                {membersMatchResult.mainWarnings.map((warning, index) => (
                  <div key={index} className="text-warning">
                    {warning}
                  </div>
                ))}
              </div>
            </ResultsSection>
          )}
        </>
      )}
    </motion.div>
  );
};
