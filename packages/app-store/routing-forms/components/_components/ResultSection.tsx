"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";

import ServerTrans from "@calcom/lib/components/ServerTrans";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/components/badge";
import type { IconName } from "@calcom/ui/components/icon";
import { Icon } from "@calcom/ui/components/icon";

import type { NonRouterRoute } from "../../types/types";
import type { MembersMatchResultType } from "./TeamMembersMatchResult";

export const ResultsSection = ({
  title,
  children,
  icon,
  hint,
  ...props
}: {
  title?: string;
  children: ReactNode;
  icon?: IconName;
  hint?: ReactNode;
  [key: string]: any;
}) => (
  <div className="bg-default border-muted mb-0.5 flex flex-col gap-0.5 rounded-2xl border p-1" {...props}>
    {(title || icon) && (
      <div className="flex items-center gap-2 px-2 py-1">
        {icon && (
          <div className="border-subtle rounded-lg border p-1">
            <Icon name={icon} className="h-4 w-4" />
          </div>
        )}
        <h4 className="text-sm font-medium leading-none" data-testid="chosen-route-title">
          {title}
        </h4>
      </div>
    )}
    <div className="border-subtle rounded-xl border px-3 py-2">{children}</div>
    {hint && hint}
  </div>
);

export const TeamMember = ({ name, email, score }: { name: string | null; email: string; score: number }) => (
  <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
    <div className="flex flex-col">
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
  chosenRoute: NonRouterRoute | null;
  supportsTeamMembersMatchingLogic?: boolean;
  membersMatchResult?: MembersMatchResultType | null;
  isPending?: boolean;
}

export const ResultsView = ({
  chosenRoute,
  supportsTeamMembersMatchingLogic = false,
  membersMatchResult = null,
  isPending = false,
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
        className="stack-y-4">
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
                <div className="stack-y-3">
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
                      <div className="stack-y-2">
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

  const notSupportingMembersMatching = ["customPageMessage", "externalRedirectUrl"];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="stack-y-4">
      {chosenRoute.action.type === "externalRedirectUrl" && (
        <ResultsSection title={chosenRoute.name ?? "External Redirect"} icon="zap">
          <div className="flex items-center gap-2">
            <div className="border-subtle rounded-lg border p-1">
              <Icon name="external-link" className="h-4 w-4" />
            </div>
            <span
              data-testid="test-routing-result"
              className="text-emphasis text-sm font-medium leading-none">
              {chosenRoute.action.value}
            </span>
          </div>
        </ResultsSection>
      )}

      {chosenRoute.action.type === "eventTypeRedirectUrl" && (
        <ResultsSection title={chosenRoute.name ?? "Event Redirect"} icon="zap">
          <div className="flex items-center gap-2">
            <div className="border-subtle rounded-lg border p-1">
              <Icon name="calendar" className="h-4 w-4" />
            </div>
            <span
              data-testid="test-routing-result"
              className="text-emphasis text-sm font-medium leading-none">
              {chosenRoute.action.value}
            </span>
          </div>
        </ResultsSection>
      )}

      {chosenRoute.action.type === "customPageMessage" && (
        <ResultsSection title={chosenRoute.name ?? "Custom Page"} icon="file-text">
          <div className="flex items-center gap-2">
            <div className="border-subtle rounded-lg border p-1">
              <Icon name="file-text" className="h-4 w-4" />
            </div>
            <span
              data-testid="test-routing-result"
              className="text-emphasis text-sm font-medium leading-none">
              {chosenRoute.action.value}
            </span>
          </div>
        </ResultsSection>
      )}

      {supportsTeamMembersMatchingLogic &&
        membersMatchResult &&
        !notSupportingMembersMatching.includes(chosenRoute.action.type) && (
          <>
            <ResultsSection title="Matching" icon="atom">
              <div className="relative flex flex-col gap-3">
                {/* Seperator */}
                <div className="absolute bottom-3 left-3 top-3 w-px bg-gray-200" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className="border-subtle bg-default z-10 rounded-lg border p-1 ">
                      <Icon name="activity" className="h-4 w-4" />
                    </div>
                    <span className="text-emphasis text-sm font-medium leading-none">
                      Attribute logic matched
                    </span>
                  </div>
                  <Badge
                    data-testid="attribute-logic-matched"
                    variant={membersMatchResult.checkedFallback ? "error" : "success"}>
                    {membersMatchResult.checkedFallback ? "No" : "Yes"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className="border-subtle bg-default z-10 rotate-180 rounded-lg border p-1">
                      <Icon name="split" className="h-4 w-4" />
                    </div>
                    <span className="text-emphasis text-sm font-medium leading-none">Attribute fallback</span>
                  </div>
                  <Badge
                    data-testid="attribute-logic-fallback-matched"
                    variant={membersMatchResult.checkedFallback ? "success" : "gray"}>
                    {membersMatchResult.checkedFallback ? "Yes" : "Not needed"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className="border-subtle bg-default z-10 rounded-lg border p-1">
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
                title={t("routing_form_next_in_queue", {
                  count: membersMatchResult.teamMembersMatchingAttributeLogic.length,
                })}
                icon="user-check"
                hint={
                  <div className="flex items-center gap-2 px-2 py-1">
                    <Icon name="info" className="h-3 w-3" />
                    <span data-testid="matching-members" className="text-subtle text-sm">
                      <ServerTrans
                        t={t}
                        i18nKey="routing_preview_more_info_found_insights"
                        components={[
                          <Link
                            key="routing_insights"
                            className="underline underline-offset-2"
                            target="_blank"
                            href="/insights/router-position">
                            Routing Insights
                          </Link>,
                        ]}
                      />
                    </span>
                  </div>
                }>
                <div className="divide-subtle divide-y">
                  {membersMatchResult.teamMembersMatchingAttributeLogic.map((member, index) => (
                    <TeamMember
                      key={member.id}
                      email={member.email}
                      name={member.name}
                      score={membersMatchResult.perUserData?.bookingShortfalls?.[member.id] || 0}
                    />
                  ))}
                </div>
              </ResultsSection>
            )}

            {membersMatchResult.mainWarnings && membersMatchResult.mainWarnings.length > 0 && (
              <ResultsSection title="Warnings" icon="triangle-alert">
                <div className="stack-y-2">
                  {membersMatchResult.mainWarnings.map((warning, index) => (
                    <div data-testid="alert" key={index} className="text-warning">
                      {warning}
                    </div>
                  ))}
                </div>
              </ResultsSection>
            )}

            {membersMatchResult.fallbackWarnings && membersMatchResult.fallbackWarnings.length > 0 && (
              <ResultsSection title="Fallback Warnings" icon="triangle-alert">
                <div className="stack-y-2">
                  {membersMatchResult.fallbackWarnings.map((warning, index) => (
                    <div data-testid="alert" key={index} className="text-warning">
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
