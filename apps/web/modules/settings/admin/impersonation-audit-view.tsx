"use client";

import dayjs from "@calcom/dayjs";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Table } from "@calcom/ui/components/table";
import { keepPreviousData } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const { Body, Cell, ColumnTitle, Header, Row } = Table;

const FETCH_LIMIT = 25;

export default function ImpersonationAuditView() {
  const { t } = useLocale();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const { data, fetchNextPage, isFetching, hasNextPage } =
    trpc.viewer.admin.impersonationAuditLog.useInfiniteQuery(
      {
        limit: FETCH_LIMIT,
        searchTerm: debouncedSearchTerm || undefined,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        placeholderData: keepPreviousData,
        refetchOnWindowFocus: false,
      }
    );

  const flatData = useMemo(() => data?.pages?.flatMap((page) => page.rows) ?? [], [data]);

  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        if (scrollHeight - scrollTop - clientHeight < 300 && !isFetching && hasNextPage) {
          fetchNextPage();
        }
      }
    },
    [fetchNextPage, isFetching, hasNextPage]
  );

  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached]);

  const showNoResults = flatData.length === 0 && !isFetching;

  return (
    <div>
      <TextField
        placeholder={t("search_impersonation_audit_placeholder")}
        label={t("search")}
        addOnLeading={<Icon name="search" className="text-subtle h-4 w-4" />}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-md"
      />

      {showNoResults && (
        <div className="bg-muted border-muted mt-5 rounded-xl border p-1">
          <div className="bg-default border-muted flex flex-col items-center justify-center rounded-[10px] border px-5 py-16">
            <Icon name="user-check" className="text-subtle mb-4 h-12 w-12" />
            <h3 className="text-emphasis text-lg font-semibold">{t("no_impersonation_logs")}</h3>
            <p className="text-subtle mt-2 text-sm">{t("no_impersonation_logs_description")}</p>
          </div>
        </div>
      )}

      {flatData.length > 0 && (
        <div className="bg-muted border-muted mt-5 rounded-xl border p-1">
          <div
            className="bg-default border-muted rounded-[10px] border"
            ref={tableContainerRef}
            onScroll={() => fetchMoreOnBottomReached(tableContainerRef.current)}
            style={{
              height: "calc(100vh - 30vh)",
              overflow: "auto",
            }}>
            <Table>
              <Header>
                <ColumnTitle widthClassNames="w-auto">{t("impersonated_user")}</ColumnTitle>
                <ColumnTitle widthClassNames="w-auto">{t("impersonated_by")}</ColumnTitle>
                <ColumnTitle>{t("date")}</ColumnTitle>
              </Header>
              <Body>
                {flatData.map((log) => {
                  return (
                    <Row key={log.id}>
                      <Cell widthClassNames="w-auto">
                        <div className="flex items-center gap-3">
                          <Avatar
                            size="sm"
                            alt={log.impersonatedUser.name || "User"}
                            imageSrc={log.impersonatedUser.avatarUrl}
                          />
                          <div>
                            <div className="text-default text-sm font-medium">
                              {log.impersonatedUser.name || "No name"}
                              {log.impersonatedUser.username && (
                                <span className="text-subtle ml-1 text-xs">
                                  @{log.impersonatedUser.username}
                                </span>
                              )}
                            </div>
                            <div className="text-muted break-all text-xs">{log.impersonatedUser.email}</div>
                          </div>
                        </div>
                      </Cell>
                      <Cell widthClassNames="w-auto">
                        <div className="flex items-center gap-3">
                          <Avatar
                            size="sm"
                            alt={log.impersonatedBy.name || "Admin"}
                            imageSrc={log.impersonatedBy.avatarUrl}
                          />
                          <div>
                            <div className="text-default text-sm font-medium">
                              {log.impersonatedBy.name || "No name"}
                              {log.impersonatedBy.username && (
                                <span className="text-subtle ml-1 text-xs">
                                  @{log.impersonatedBy.username}
                                </span>
                              )}
                            </div>
                            <div className="text-muted break-all text-xs">{log.impersonatedBy.email}</div>
                          </div>
                        </div>
                      </Cell>
                      <Cell>
                        <span
                          className="text-subtle text-xs"
                          title={dayjs(log.createdAt).format("MMMM D, YYYY h:mm A")}>
                          {dayjs(log.createdAt).fromNow()}
                        </span>
                      </Cell>
                    </Row>
                  );
                })}
              </Body>
            </Table>
          </div>
        </div>
      )}

      {isFetching && flatData.length === 0 && (
        <div className="bg-muted border-muted mt-5 rounded-xl border p-1">
          <div className="bg-default border-muted flex flex-col items-center justify-center rounded-[10px] border px-5 py-16">
            <Icon name="loader" className="text-subtle mb-4 h-8 w-8 animate-spin" />
            <p className="text-subtle text-sm">{t("loading")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
