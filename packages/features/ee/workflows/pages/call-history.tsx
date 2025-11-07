"use client";

import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { usePathname } from "next/navigation";
import { useMemo, useState, useReducer } from "react";

import {
  DataTableProvider,
  DataTableWrapper,
  DataTableToolbar,
  DataTableFilters,
  useColumnFilters,
  ColumnFilterType,
  convertFacetedValuesToMap,
  useDataTable,
} from "@calcom/features/data-table";
import { useSegments } from "@calcom/features/data-table/hooks/useSegments";
import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";

import { CallDetailsSheet } from "../components/CallDetailsSheet";
import type { CallDetailsState, CallDetailsAction } from "../components/types";

type CallHistoryRow = {
  id: string;
  time: string;
  duration: number;
  channelType: "web_call" | "phone_call";
  sessionId: string;
  endReason: string;
  sessionStatus: "completed" | "ongoing" | "failed";
  userSentiment: "positive" | "neutral" | "negative";
  from: string;
  to: string;
  callCreated: boolean;
  inVoicemail: boolean;
};

export type CallHistoryProps = {
  org?: RouterOutputs["viewer"]["organizations"]["listCurrent"];
};

const initialState: CallDetailsState = {
  callDetailsSheet: {
    showModal: false,
  },
};

function reducer(state: CallDetailsState, action: CallDetailsAction): CallDetailsState {
  switch (action.type) {
    case "OPEN_CALL_DETAILS":
      return { ...state, callDetailsSheet: action.payload };
    case "CLOSE_MODAL":
      return {
        ...state,
        callDetailsSheet: { showModal: false },
      };
    default:
      return state;
  }
}

function CallHistoryTable(props: CallHistoryProps) {
  const pathname = usePathname();
  if (!pathname) return null;
  return (
    <DataTableProvider tableIdentifier={pathname} useSegments={useSegments} defaultPageSize={25}>
      <CallHistoryContent {...props} />
    </DataTableProvider>
  );
}

function CallHistoryContent({ org: _org }: CallHistoryProps) {
  const orgBranding = useOrgBranding();
  const _domain = orgBranding?.fullDomain ?? WEBAPP_URL;
  const { t } = useLocale();
  const [rowSelection, setRowSelection] = useState({});
  const [state, dispatch] = useReducer(reducer, initialState);

  const _columnFilters = useColumnFilters();
  const { limit, offset, searchTerm: _searchTerm } = useDataTable();

  // Fetch calls data from API
  const {
    data: callsData,
    isPending: isLoadingCalls,
    error: _callsError,
  } = trpc.viewer.aiVoiceAgent.listCalls.useQuery({
    limit,
    offset,
    filters: {},
  });

  const callHistoryData: CallHistoryRow[] = useMemo(() => {
    if (!callsData?.calls) return [];

    return callsData.calls.map((call) => ({
      id: call.call_id || call.id || Math.random().toString(),
      time: call.start_timestamp ? new Date(call.start_timestamp).toISOString() : new Date().toISOString(),
      duration: Math.round((call.duration_ms || 0) / 1000),
      channelType: (call.call_type || "phone_call") as "web_call" | "phone_call",
      sessionId: call.call_id || call.id || "unknown",
      endReason: call.disconnection_reason || "Unknown",
      sessionStatus:
        call.call_status === "ended" ? "completed" : call.call_status === "ongoing" ? "ongoing" : "failed",
      userSentiment:
        call.call_analysis?.user_sentiment?.toLowerCase() === "positive"
          ? "positive"
          : call.call_analysis?.user_sentiment?.toLowerCase() === "negative"
          ? "negative"
          : "neutral",
      from: call.from_number || "Unknown",
      to: call.to_number || "Unknown",
      callCreated: call.call_created ?? true,
      inVoicemail: call.in_voicemail ?? false,
    }));
  }, [callsData?.calls]);

  const columns = useMemo<ColumnDef<CallHistoryRow>[]>(
    () => [
      {
        id: "time",
        accessorKey: "time",
        header: t("time_header"),
        size: 150,
        cell: ({ row }) => {
          const date = new Date(row.original.time);
          return (
            <div className="text-sm">
              <div>{date.toLocaleDateString()}</div>
              <div className="text-subtle">{date.toLocaleTimeString()}</div>
            </div>
          );
        },
      },
      {
        id: "duration",
        accessorKey: "duration",
        header: t("duration"),
        size: 140,
        cell: ({ row }) => {
          const seconds = row.original.duration;
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          return <span>{`${minutes}:${remainingSeconds.toString().padStart(2, "0")}`}</span>;
        },
      },
      {
        id: "channelType",
        accessorKey: "channelType",
        header: t("channel_type"),
        size: 160,
        meta: {
          filter: { type: ColumnFilterType.MULTI_SELECT },
        },
        cell: ({ row }) => <span>{row.original.channelType}</span>,
      },
      {
        id: "sessionId",
        accessorKey: "sessionId",
        header: t("session_id"),
        size: 210,
        cell: ({ row }) => <code className="text-xs">{row.original.sessionId}</code>,
      },
      {
        id: "endReason",
        accessorKey: "endReason",
        header: t("end_reason"),
        size: 180,
      },
      {
        id: "sessionStatus",
        accessorKey: "sessionStatus",
        header: t("session_status"),
        size: 200,
        meta: {
          filter: { type: ColumnFilterType.MULTI_SELECT },
        },
        cell: ({ row }) => {
          const status = row.original.sessionStatus;
          const variant = status === "completed" ? "green" : status === "ongoing" ? "blue" : "red";
          return <Badge variant={variant}>{status}</Badge>;
        },
      },
      {
        id: "userSentiment",
        accessorKey: "userSentiment",
        header: t("user_sentiment"),
        size: 200,
        meta: {
          filter: { type: ColumnFilterType.MULTI_SELECT },
        },
        cell: ({ row }) => {
          const sentiment = row.original.userSentiment;
          const variant = sentiment === "positive" ? "green" : sentiment === "negative" ? "red" : "gray";
          return <Badge variant={variant}>{sentiment}</Badge>;
        },
      },
      {
        id: "from",
        accessorKey: "from",
        header: t("from_header"),
        size: 140,
      },
      {
        id: "to",
        accessorKey: "to",
        header: t("to"),
        size: 140,
      },
      {
        id: "callCreated",
        accessorKey: "callCreated",
        header: t("call_created"),
        size: 200,
        cell: ({ row }) => {
          const created = row.original.callCreated;
          const variant = created ? "green" : "red";
          return <Badge variant={variant}>{created ? t("successful") : t("unsuccessful")}</Badge>;
        },
      },
      {
        id: "inVoicemail",
        accessorKey: "inVoicemail",
        header: t("voicemail"),
        size: 150,
        cell: ({ row }) => {
          const inVoicemail = row.original.inVoicemail;
          const variant = inVoicemail ? "blue" : "gray";
          return <Badge variant={variant}>{inVoicemail ? t("yes") : t("no")}</Badge>;
        },
      },
    ],
    [t]
  );

  const table = useReactTable({
    data: callHistoryData,
    columns,
    enableRowSelection: false,
    manualPagination: true,
    state: {
      rowSelection,
    },
    initialState: {
      columnPinning: {
        left: ["time"],
      },
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    getFacetedUniqueValues: (_, columnId) => () => {
      switch (columnId) {
        case "channelType":
          return convertFacetedValuesToMap([
            { label: "Web Call", value: "web_call" },
            { label: "Phone Call", value: "phone_call" },
          ]);
        case "sessionStatus":
          return convertFacetedValuesToMap([
            { label: "Completed", value: "completed" },
            { label: "Ongoing", value: "ongoing" },
            { label: "Failed", value: "failed" },
          ]);
        case "userSentiment":
          return convertFacetedValuesToMap([
            { label: "Positive", value: "positive" },
            { label: "Neutral", value: "neutral" },
            { label: "Negative", value: "negative" },
          ]);
        default:
          return new Map();
      }
    },
  });

  return (
    <>
      <DataTableWrapper<CallHistoryRow>
        testId="call-history-data-table"
        table={table}
        isPending={isLoadingCalls}
        totalRowCount={callsData?.totalCount || 0}
        paginationMode="standard"
        rowClassName="cursor-pointer hover:bg-subtle"
        onRowMouseclick={(row) => {
          const callIndex = callHistoryData.findIndex((call) => call.id === row.original.id);
          if (callIndex !== -1 && callsData?.calls?.[callIndex]) {
            dispatch({
              type: "OPEN_CALL_DETAILS",
              payload: {
                showModal: true,
                selectedCall: callsData.calls[callIndex],
              },
            });
          }
        }}
        ToolbarLeft={
          <>
            <DataTableToolbar.SearchBar />
            <DataTableFilters.ColumnVisibilityButton table={table} />
            <DataTableFilters.FilterBar table={table} />
          </>
        }
        ToolbarRight={
          <>
            <DataTableFilters.ClearFiltersButton />
          </>
        }
      />

      {state.callDetailsSheet.showModal && <CallDetailsSheet state={state} dispatch={dispatch} />}
    </>
  );
}

function CallHistoryPage() {
  const { data: org } = trpc.viewer.organizations.listCurrent.useQuery();

  return <CallHistoryTable org={org} />;
}

export default CallHistoryPage;
