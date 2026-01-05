"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { PanelCard } from "@calcom/ui/components/card";
import { Input } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { useState } from "react";

type TeamListItem = RouterOutputs["viewer"]["admin"]["teams"]["list"]["teams"][number];

export const TeamsList = () => {
  const { t } = useLocale();
  const [searchTerm, setSearchTerm] = useState("");
  const [type, setType] = useState<"ALL" | "TEAM" | "ORGANIZATION">("ALL");
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const limit = 25;

  const { data, isLoading, refetch } = trpc.viewer.admin.teams.list.useQuery({
    cursor,
    limit,
    searchTerm: searchTerm || undefined,
    type,
  });

  const teams: TeamListItem[] = data?.teams ?? [];
  const totalCount = data?.meta?.totalCount ?? 0;
  const nextCursor = data?.nextCursor;

  const activeSubscriptions = teams.filter((t) => t.billing?.status === "active").length;
  const billingIssues = teams.filter((t) => t.billing?.hasPendingPayment).length;
  const organizations = teams.filter((t) => t.isOrganization).length;

  const handleSearch = () => {
    setCursor(undefined);
    refetch();
  };

  const handleNext = () => {
    if (nextCursor) {
      setCursor(nextCursor);
    }
  };

  const handlePrevious = () => {
    if (cursor && cursor >= limit) {
      setCursor(cursor - limit);
    } else {
      setCursor(undefined);
    }
  };

  if (isLoading && !data) {
    return (
      <SkeletonContainer>
        <div className="space-y-6">
          <SkeletonText className="h-32 w-full" />
          <SkeletonText className="h-64 w-full" />
        </div>
      </SkeletonContainer>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <PanelCard title={t("total_teams")}>
          <div className="p-4">
            <div className="text-3xl font-bold">{totalCount}</div>
            <p className="text-muted text-sm">{t("teams_and_organizations")}</p>
          </div>
        </PanelCard>
        <PanelCard title={t("active_subscriptions")}>
          <div className="p-4">
            <div className="text-emphasis text-3xl font-bold">{activeSubscriptions}</div>
            <p className="text-muted text-sm">{t("with_billing")}</p>
          </div>
        </PanelCard>
        <PanelCard title={t("billing_issues")}>
          <div className="p-4">
            <div className="text-3xl font-bold text-red-600">{billingIssues}</div>
            <p className="text-muted text-sm">{t("requires_attention")}</p>
          </div>
        </PanelCard>
        <PanelCard title={t("organizations")}>
          <div className="p-4">
            <div className="text-3xl font-bold">{organizations}</div>
            <p className="text-muted text-sm">{t("parent_organizations")}</p>
          </div>
        </PanelCard>
      </div>

      {/* Teams Table */}
      <PanelCard title={t("all_teams_and_organizations")}>
        <div className="space-y-4 p-4">
          {/* Search and Filters */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <Input
                type="text"
                placeholder={t("search_teams")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
              />
            </div>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as "ALL" | "TEAM" | "ORGANIZATION");
                setCursor(undefined);
              }}
              className="border-default text-emphasis focus:ring-emphasis block rounded-md border px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2">
              <option value="ALL">{t("all_types")}</option>
              <option value="TEAM">{t("teams_only")}</option>
              <option value="ORGANIZATION">{t("organizations_only")}</option>
            </select>
            <Button onClick={handleSearch}>
              <Icon name="search" className="mr-2 h-4 w-4" />
              {t("search")}
            </Button>
          </div>

          {/* Teams Table */}
          <div className="border-subtle overflow-hidden rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-muted">
                <tr>
                  <th className="text-emphasis px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    {t("name")}
                  </th>
                  <th className="text-emphasis px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    {t("type")}
                  </th>
                  <th className="text-emphasis px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    {t("members")}
                  </th>
                  <th className="text-emphasis px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    {t("billing")}
                  </th>
                  <th className="text-emphasis px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    {t("created")}
                  </th>
                  <th className="text-emphasis px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    {t("actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-default divide-subtle divide-y">
                {teams.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <p className="text-muted">{t("no_teams_found")}</p>
                    </td>
                  </tr>
                ) : (
                  teams.map((team) => (
                    <tr key={team.id} className="hover:bg-subtle">
                      <td className="px-6 py-4">
                        <div className="text-emphasis font-medium">{team.name}</div>
                        <div className="text-muted text-sm">/{team.slug}</div>
                        {team.parent && (
                          <div className="text-muted mt-1 text-xs">Parent: {team.parent.name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={team.isOrganization ? "blue" : "gray"}>
                          {team.isOrganization ? t("organization") : t("team")}
                        </Badge>
                      </td>
                      <td className="text-emphasis px-6 py-4">{team.memberCount}</td>
                      <td className="px-6 py-4">
                        {team.billing ? (
                          <div>
                            <div className="text-emphasis text-sm">{team.billing.planName}</div>
                            <Badge
                              variant={
                                team.billing.hasPendingPayment
                                  ? "red"
                                  : team.billing.status === "active"
                                    ? "green"
                                    : "gray"
                              }>
                              {team.billing.status}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted text-sm">{t("no_billing")}</span>
                        )}
                      </td>
                      <td className="text-emphasis px-6 py-4 text-sm">
                        {new Date(team.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          href={`/settings/admin/teams/${team.id}`}
                          color="secondary"
                          size="sm"
                          EndIcon="arrow-right">
                          {t("view_details")}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-muted text-sm">
              {t("showing_x_of_y", { x: teams.length, y: totalCount })}
            </div>
            <div className="flex gap-2">
              <Button color="secondary" onClick={handlePrevious} disabled={!cursor} StartIcon="chevron-left">
                {t("previous")}
              </Button>
              <Button color="secondary" onClick={handleNext} disabled={!nextCursor} EndIcon="chevron-right">
                {t("next")}
              </Button>
            </div>
          </div>
        </div>
      </PanelCard>
    </div>
  );
};
