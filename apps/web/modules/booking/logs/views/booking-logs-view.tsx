/**
 * TODO: Move it to features/booking-audit
 */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import dayjs from "@calcom/dayjs";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { FilterSearchField, Select } from "@calcom/ui/components/form";

interface BookingLogsViewProps {
    bookingUid: string;
}

type AuditLog = {
    id: string;
    action: string;
    type: string;
    timestamp: string;
    data: Record<string, unknown> | null;
    actor: {
        type: string;
        displayName: string | null;
    };
};

interface BookingLogsFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    typeFilter: string | null;
    onTypeFilterChange: (value: string | null) => void;
    actorFilter: string | null;
    onActorFilterChange: (value: string | null) => void;
    typeOptions: Array<{ label: string; value: string }>;
    actorOptions: Array<{ label: string; value: string }>;
}

interface BookingLogsTimelineProps {
    logs: AuditLog[];
}

const getActionIcon = (action: string) => {
    switch (action) {
        case "CREATED":
            return "calendar";
        case "CANCELLED":
        case "REJECTED":
            return "ban";
        case "ACCEPTED":
            return "check";
        case "RESCHEDULED":
        case "RESCHEDULE_REQUESTED":
            return "pencil";
        case "REASSIGNMENT":
        case "ATTENDEE_ADDED":
        case "ATTENDEE_REMOVED":
            return "user-check";
        case "LOCATION_CHANGED":
            return "map-pin";
        case "HOST_NO_SHOW_UPDATED":
        case "ATTENDEE_NO_SHOW_UPDATED":
            return "ban";
        default:
            return "sparkles";
    }
};

function BookingLogsFilters({
    searchTerm,
    onSearchChange,
    typeFilter,
    onTypeFilterChange,
    actorFilter,
    onActorFilterChange,
    typeOptions,
    actorOptions,
}: BookingLogsFiltersProps) {
    const { t } = useLocale();

    return (
        <div className="flex flex-wrap gap-2 items-start">
            <div className="flex-1 min-w-[200px]">
                <FilterSearchField
                    size="sm"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    containerClassName=""
                />
            </div>

            <div className="min-w-[140px]">
                <Select
                    size="sm"
                    value={typeFilter ? { label: `${t("type")}: ${t(`audit_action.${typeFilter.toLowerCase()}`)}`, value: typeFilter } : { label: `${t("type")}: ${t("all")}`, value: "" }}
                    onChange={(option) => {
                        if (!option) return;
                        onTypeFilterChange(option.value || null);
                    }}
                    options={[{ label: `${t("type")}: ${t("all")}`, value: "" }, ...typeOptions.map(opt => ({ ...opt, label: `${t("type")}: ${opt.label}` }))]}
                />
            </div>

            <div className="min-w-[140px]">
                <Select
                    size="sm"
                    value={actorFilter ? { label: `${t("actor")}: ${actorFilter}`, value: actorFilter } : { label: `${t("actor")}: ${t("all")}`, value: "" }}
                    onChange={(option) => {
                        if (!option) return;
                        onActorFilterChange(option.value || null);
                    }}
                    options={[{ label: `${t("actor")}: ${t("all")}`, value: "" }, ...actorOptions.map(opt => ({ ...opt, label: `${t("actor")}: ${opt.label}` }))]}
                />
            </div>
        </div>
    );
}

function BookingLogsTimeline({ logs }: BookingLogsTimelineProps) {
    const { t } = useLocale();
    const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
    const [showJsonMap, setShowJsonMap] = useState<Record<string, boolean>>({});

    const toggleExpand = (logId: string) => {
        setExpandedLogIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(logId)) {
                newSet.delete(logId);
            } else {
                newSet.add(logId);
            }
            return newSet;
        });
    };

    const toggleJson = (logId: string) => {
        setShowJsonMap((prev) => ({
            ...prev,
            [logId]: !prev[logId],
        }));
    };

    if (logs.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-muted">{t("no_audit_logs_found")}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-0.5">
            {logs.map((log, index) => {
                const isLast = index === logs.length - 1;
                const isExpanded = expandedLogIds.has(log.id);
                const actionDisplay = t(`audit_action.${log.action.toLowerCase()}`);
                const showJson = showJsonMap[log.id] || false;

                return (
                    <div key={log.id} className="flex gap-1">
                        <div className="flex flex-col items-center self-stretch">
                            <div className="pt-2 shrink-0">
                                <div className="bg-subtle rounded-[3.556px] p-1 flex items-center justify-center w-4 h-4">
                                    <Icon name={getActionIcon(log.action)} className="h-3 w-3 text-subtle" />
                                </div>
                            </div>
                            {!isLast && (
                                <div className="w-px bg-subtle flex-1 min-h-0" />
                            )}
                        </div>

                        <div className="flex-1 rounded-lg py-2">
                            <div className="px-3 mb-2">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-medium text-emphasis leading-4">
                                            {actionDisplay}
                                        </h3>
                                        <div className="flex items-center gap-1 mt-1 text-xs text-subtle">
                                            <span>{log.actor.displayName}</span>
                                            <span>•</span>
                                            <span>{dayjs(log.timestamp).fromNow()}</span>
                                        </div>
                                    </div>

                                    <Button
                                        color="minimal"
                                        size="sm"
                                        variant="icon"
                                        StartIcon="ellipsis"
                                        className="h-6 w-6"
                                    />
                                </div>
                            </div>

                            <div className="px-3">
                                <div className="bg-muted rounded-[10px] py-1">
                                    <Button
                                        color="minimal"
                                        size="sm"
                                        onClick={() => toggleExpand(log.id)}
                                        StartIcon={isExpanded ? "chevron-down" : "chevron-right"}
                                        className="w-full justify-start text-xs font-medium text-subtle h-6">
                                        {isExpanded ? t("hide_details") : t("show_details")}
                                    </Button>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="mt-2 px-3">
                                    <div className="space-y-2 text-xs">
                                        <div className="flex items-start gap-2">
                                            <span className="font-medium text-emphasis min-w-[80px]">{t("type")}</span>
                                            <span className="text-default">{log.type}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="font-medium text-emphasis min-w-[80px]">{t("actor")}</span>
                                            <span className="text-default">{log.actor.type}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="font-medium text-emphasis min-w-[80px]">
                                                {t("timestamp")}
                                            </span>
                                            <span className="text-default">
                                                {dayjs(log.timestamp).format("YYYY-MM-DD HH:mm:ss")}
                                            </span>
                                        </div>

                                        {log.data && Object.keys(log.data).length > 0 && (
                                            <div className="pt-2">
                                                <Button
                                                    color="minimal"
                                                    size="sm"
                                                    onClick={() => toggleJson(log.id)}
                                                    StartIcon={showJson ? "chevron-down" : "chevron-right"}
                                                    className="mb-1 h-6 px-0 font-medium">
                                                    {t("json")}
                                                </Button>
                                                {showJson && (
                                                    <pre className="bg-subtle p-3 rounded-md text-[10px] overflow-x-auto text-default font-mono border border-subtle">
                                                        {JSON.stringify(log.data, null, 2)}
                                                    </pre>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function BookingLogsView({ bookingUid }: BookingLogsViewProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState<string | null>(null);
    const [actorFilter, setActorFilter] = useState<string | null>(null);
    const { t } = useLocale();
    const { data, isLoading, error } = trpc.viewer.bookings.getAuditLogs.useQuery({
        bookingUid,
    });

    if (error) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <p className="text-red-600 font-medium">{t("error_loading_booking_logs")}</p>
                    <p className="text-sm text-gray-500 mt-2">{error.message}</p>
                    <Button className="mt-4" onClick={() => router.back()}>
                        {t("go_back")}
                    </Button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                <SkeletonText className="h-12 w-full" />
                <SkeletonText className="h-24 w-full" />
                <SkeletonText className="h-24 w-full" />
                <SkeletonText className="h-24 w-full" />
            </div>
        );
    }

    const auditLogs = data?.auditLogs || [];

    // Apply filters
    const filteredLogs = auditLogs.filter((log) => {
        const matchesSearch =
            !searchTerm ||
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.actor.displayName?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = !typeFilter || log.action === typeFilter;
        const matchesActor = !actorFilter || log.actor.type === actorFilter;

        return matchesSearch && matchesType && matchesActor;
    });

    const uniqueTypes = Array.from(new Set(auditLogs.map((log) => log.action)));
    const uniqueActorTypes = Array.from(new Set(auditLogs.map((log) => log.actor.type)));

    const typeOptions = uniqueTypes.map((type) => ({
        label: t(`audit_action.${type.toLowerCase()}`),
        value: type,
    }));

    const actorOptions = uniqueActorTypes.map((actorType) => ({
        label: actorType,
        value: actorType,
    }));

    return (
        <div className="space-y-6">
            <BookingLogsFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
                actorFilter={actorFilter}
                onActorFilterChange={setActorFilter}
                typeOptions={typeOptions}
                actorOptions={actorOptions}
            />

            <BookingLogsTimeline logs={filteredLogs} />
        </div>
    );
}
