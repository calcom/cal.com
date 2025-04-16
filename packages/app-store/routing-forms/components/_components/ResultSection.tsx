"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { NonRouterRoute } from "routing-forms/types/types";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import type { IconName } from "@calcom/ui/components/icon";
import { Icon } from "@calcom/ui/components/icon";

export const ResultsSection = ({
  title,
  children,
  icon,
}: {
  title?: string;
  children: ReactNode;
  icon?: IconName;
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
    <div className="border-subtle rounded-xl border px-3 pt-2">{children}</div>
  </div>
);

export const StatusBadge = ({ status, type }: { status: string; type: "success" | "neutral" | "error" }) => {
  const colors = {
    success: "text-green-700 bg-green-100",
    neutral: "text-gray-700 bg-gray-100",
    error: "text-red-700 bg-red-100",
  };
  return <span className={`rounded-md px-2 py-1 text-sm ${colors[type]}`}>{status}</span>;
};

export const TeamMember = ({ name, tags, score }: { name: string; tags: string[]; score: number }) => (
  <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
    <div className="flex items-center space-x-2">
      <div className="h-8 w-8 rounded-full bg-gray-200" /> {/* Avatar placeholder */}
      <div>
        <h5 className="text-emphasis font-medium">{name}</h5>
        <div className="mt-1 flex gap-2">
          {tags.map((tag) => (
            <span key={tag} className="bg-subtle text-emphasis rounded-md px-2 py-1 text-xs">
              {tag}
            </span>
          ))}
        </div>
      </div>
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
}

export const ResultsView = ({ onBack, chosenRoute }: ResultsViewProps) => {
  const { t } = useLocale();

  if (!chosenRoute) return null;

  console.log("chosenRoute", chosenRoute);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-emphasis text-lg font-semibold">{t("results")}</h3>
        <Button color="minimal" size="sm" variant="icon" StartIcon="x" onClick={onBack} />
      </div>

      {/* {chosenRoute.action.type === "customPageMessage" ? (
        <span className="text-default" data-testid="test-routing-result">
          {chosenRoute.action.value}
        </span>
      ) : chosenRoute.action.type === "externalRedirectUrl" ? (
        <span className="text-default underline">
          <a
            target="_blank"
            data-testid="test-routing-result"
            href={
              chosenRoute.action.value.includes("https://") || chosenRoute.action.value.includes("http://")
                ? chosenRoute.action.value
                : `http://${chosenRoute.action.value}`
            }
            rel="noreferrer">
            {chosenRoute.action.value}
          </a>
        </span>
      ) : (
        <div className="flex flex-col space-y-2">
          <span className="text-default underline">
            <a
              target="_blank"
              className={classNames(
                findTeamMembersMatchingAttributeLogicMutation.isPending && "pointer-events-none"
              )}
              href={membersMatchResult?.eventTypeRedirectUrl ?? eventTypeUrlWithoutParams}
              rel="noreferrer"
              data-testid="test-routing-result">
              {chosenRoute.action.value}
            </a>
          </span>
          {renderTeamMembersMatchResult(showAllData, findTeamMembersMatchingAttributeLogicMutation.isPending)}
        </div>
      )} */}

      {chosenRoute.action.type === "eventTypeRedirectUrl" && (
        <ResultsSection title={chosenRoute.name ?? ""} icon="zap">
          <div className="flex items-center gap-2">
            <div className="border-subtle rounded-lg border p-1">
              <Icon name="calendar" className="h-4 w-4" />
            </div>
            <span className="text-default">{chosenRoute.action.value}</span>
          </div>
        </ResultsSection>
      )}

      <ResultsSection title="Matching">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-default">Attribute logic matched</span>
            <StatusBadge status="Yes" type="success" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-default">Attribute fallback</span>
            <StatusBadge status="Not needed" type="neutral" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-default">Contact owner</span>
            <StatusBadge status="Not found" type="neutral" />
          </div>
        </div>
      </ResultsSection>

      <ResultsSection title="1 assigned">
        <div className="divide-subtle divide-y">
          <TeamMember name="Cédric Raoult" tags={["Immigration", "France"]} score={20} />
        </div>
      </ResultsSection>

      <ResultsSection title="4 next in queue">
        <div className="divide-subtle divide-y">
          <TeamMember name="Claire Dupont" tags={["Immigration", "France"]} score={10} />
          <TeamMember name="Pierre Moreau" tags={["Immigration", "France"]} score={0} />
          <TeamMember name="Carmen Rodríguez" tags={["Immigration", "Spain"]} score={-2} />
          <TeamMember name="Mariana Silva" tags={["Immigration", "Portugal"]} score={-24} />
        </div>
      </ResultsSection>

      <div className="text-subtle text-sm">
        Result is for demo purposes only.{" "}
        <a href="#" className="text-emphasis underline">
          Learn more
        </a>
      </div>
    </motion.div>
  );
};
