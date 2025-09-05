"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { withLicenseRequired } from "@calcom/features/ee/common/components/LicenseRequired";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { DropdownActions, Table } from "@calcom/ui/components/table";
import { showToast } from "@calcom/ui/components/toast";

import { TeamEditSheet } from "./TeamEditSheet";
import { TeamFeaturesSheet } from "./TeamFeaturesSheet";

const { Cell, ColumnTitle, Header, Row } = Table;

const FETCH_LIMIT = 25;

function TeamsTableBare() {
  const { t } = useLocale();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showFeaturesSheet, setShowFeaturesSheet] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const { data, fetchNextPage, isFetching } = trpc.viewer.admin.teams.listPaginated.useInfiniteQuery(
    {
      limit: FETCH_LIMIT,
      searchTerm: debouncedSearchTerm,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      placeholderData: keepPreviousData,
      refetchOnWindowFocus: false,
    }
  );

  const deleteTeamMutation = trpc.viewer.admin.teams.delete.useMutation({
    onSuccess: () => {
      showToast(t("team_deleted_successfully"), "success");
      utils.viewer.admin.teams.listPaginated.invalidate();
    },
    onError: (err) => {
      console.error(err.message);
      showToast(t("error_deleting_team"), "error");
    },
    onSettled: () => {
      setTeamToDelete(null);
    },
  });

  //we must flatten the array of arrays from the useInfiniteQuery hook
  const flatData = useMemo(() => data?.pages?.flatMap((page) => page.rows) ?? [], [data]);
  const totalRowCount = data?.pages?.[0]?.meta?.totalRowCount ?? 0;
  const totalFetched = flatData.length;

  //called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        //once the user has scrolled within 300px of the bottom of the table, fetch more data if there is any
        if (scrollHeight - scrollTop - clientHeight < 300 && !isFetching && totalFetched < totalRowCount) {
          fetchNextPage();
        }
      }
    },
    [fetchNextPage, isFetching, totalFetched, totalRowCount]
  );

  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached]);

  const [teamToDelete, setTeamToDelete] = useState<number | null>(null);

  const handleEditTeam = (teamId: number) => {
    setSelectedTeam(teamId);
    setShowEditSheet(true);
  };

  const handleManageFeatures = (teamId: number) => {
    setSelectedTeam(teamId);
    setShowFeaturesSheet(true);
  };

  return (
    <div>
      <TextField
        placeholder={t("search_teams")}
        label={t("search")}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div
        className="border-subtle rounded-md border"
        ref={tableContainerRef}
        onScroll={() => fetchMoreOnBottomReached()}
        style={{
          height: "calc(100vh - 30vh)",
          overflow: "auto",
        }}>
        <Table>
          <Header>
            <ColumnTitle widthClassNames="w-auto">{t("team")}</ColumnTitle>
            <ColumnTitle>{t("type")}</ColumnTitle>
            <ColumnTitle>{t("members")}</ColumnTitle>
            <ColumnTitle>{t("created_at")}</ColumnTitle>
            <ColumnTitle widthClassNames="w-auto">
              <span className="sr-only">{t("edit")}</span>
            </ColumnTitle>
          </Header>

          <tbody className="divide-subtle divide-y rounded-md">
            {flatData.map((team) => (
              <Row key={team.id}>
                <Cell widthClassNames="w-auto">
                  <div className="min-h-10 flex ">
                    <Avatar
                      size="md"
                      alt={`Avatar of ${team.name}`}
                      imageSrc={team.bannerUrl || `${WEBAPP_URL}/team/${team.slug}/avatar.png`}
                    />

                    <div className="text-subtle ml-4 font-medium">
                      <div className="flex gap-3">
                        <span className="text-default">{team.name}</span>
                        <span>/{team.slug}</span>
                        {team.isOrganization && (
                          <span className="flex items-center gap-1">
                            <Icon name="building" className="text-subtle size-5" />
                            <span>{t("organization")}</span>
                          </span>
                        )}
                      </div>
                      {team.bio && <span className="break-all text-sm">{team.bio}</span>}
                    </div>
                  </div>
                </Cell>
                <Cell>
                  <Badge variant={team.isOrganization ? "blue" : "gray"}>
                    {team.isOrganization ? t("organization") : t("team")}
                  </Badge>
                </Cell>
                <Cell>{team._count?.members || 0}</Cell>
                <Cell>{new Date(team.createdAt).toLocaleDateString()}</Cell>
                <Cell widthClassNames="w-auto">
                  <div className="flex w-full justify-end">
                    <DropdownActions
                      actions={[
                        {
                          id: "edit",
                          label: t("edit"),
                          onClick: () => handleEditTeam(team.id),
                          icon: "pencil",
                        },
                        {
                          id: "manage-features",
                          label: t("manage_features"),
                          onClick: () => handleManageFeatures(team.id),
                          icon: "flag",
                        },
                        {
                          id: "view-team",
                          label: t("view_team"),
                          href: `/settings/teams/${team.id}`,
                          icon: "external-link",
                        },
                        {
                          id: "delete",
                          label: t("delete"),
                          color: "destructive",
                          onClick: () => setTeamToDelete(team.id),
                          icon: "trash",
                        },
                      ]}
                    />
                  </div>
                </Cell>
              </Row>
            ))}
          </tbody>
        </Table>
        <DeleteTeamDialog
          team={teamToDelete}
          onClose={() => setTeamToDelete(null)}
          onConfirm={() => {
            if (!teamToDelete) return;
            deleteTeamMutation.mutate({ teamId: teamToDelete });
          }}
        />
      </div>

      {showEditSheet && selectedTeam && (
        <TeamEditSheet
          teamId={selectedTeam}
          open={showEditSheet}
          onClose={() => {
            setShowEditSheet(false);
            setSelectedTeam(null);
          }}
        />
      )}

      {showFeaturesSheet && selectedTeam && (
        <TeamFeaturesSheet
          teamId={selectedTeam}
          open={showFeaturesSheet}
          onClose={() => {
            setShowFeaturesSheet(false);
            setSelectedTeam(null);
          }}
        />
      )}
    </div>
  );
}

const DeleteTeamDialog = ({
  team,
  onConfirm,
  onClose,
}: {
  team: number | null;
  onConfirm: () => void;
  onClose: () => void;
}) => {
  const { t } = useLocale();
  return (
    <Dialog name="delete-team" open={!!team} onOpenChange={(open) => !open && onClose()}>
      <ConfirmationDialogContent
        title={t("delete_team")}
        confirmBtnText={t("delete")}
        cancelBtnText={t("cancel")}
        variety="danger"
        onConfirm={onConfirm}>
        <p>{t("delete_team_confirmation")}</p>
      </ConfirmationDialogContent>
    </Dialog>
  );
};

export const TeamsTable = withLicenseRequired(TeamsTableBare);
