/**
 * TODO: Move it to features/booking-audit
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import dayjs from "@calcom/dayjs";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Icon, type IconName } from "@calcom/ui/components/icon";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { FilterSearchField, Select } from "@calcom/ui/components/form";
import { Avatar } from "@calcom/ui/components/avatar";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import type { AuditActorType } from "@calcom/features/booking-audit/lib/repository/IAuditActorRepository";

interface BookingLogsViewProps {
    bookingUid: string;
}

type TranslationComponent = {
    type: "link";
    href: string;
};

type TranslationWithParams = {
    key: string;
    params?: Record<string, string | number>;
    components?: TranslationComponent[];
};

type AuditLog = {
    id: string;
    action: string;
    type: string;
    timestamp: string;
    source: string;
    displayJson?: Record<string, unknown> | null;
    actionDisplayTitle: TranslationWithParams;
    displayFields?: Array<{ labelKey: string; valueKey: string }> | null;
    actor: {
        type: AuditActorType;
        displayName: string | null;
        displayEmail: string | null;
        displayAvatar: string | null;
    };
};

interface BookingLogsFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    actorFilter: string | null;
    onActorFilterChange: (value: string | null) => void;
    actorOptions: Array<{ label: string; value: string }>;
}

interface BookingLogsTimelineProps {
    logs: AuditLog[];
}

const ACTION_ICON_MAP: Record<string, IconName> = {
    CREATED: "calendar",
    CANCELLED: "ban",
    REJECTED: "ban",
    ACCEPTED: "check",
    RESCHEDULED: "pencil",
    RESCHEDULE_REQUESTED: "pencil",
    REASSIGNMENT: "user-check",
    ATTENDEE_ADDED: "user-check",
    ATTENDEE_REMOVED: "user-check",
    LOCATION_CHANGED: "map-pin",
    HOST_NO_SHOW_UPDATED: "ban",
    ATTENDEE_NO_SHOW_UPDATED: "ban",
} as const;


const ACTOR_ROLE_LABEL_MAP: Record<AuditActorType, string | null> = {
    GUEST: "guest",
    ATTENDEE: "attendee",
    SYSTEM: null,
    USER: null,
    APP: null,
} as const;

function BookingLogsFilters({
    searchTerm,
    onSearchChange,
    actorFilter,
    onActorFilterChange,
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
                    value={actorFilter ? { label: `${t("actor")}: ${actorFilter}`, value: actorFilter } : { label: `${t("actor")}: ${t("all")}`, value: "" }}
                    onChange={(option) => {
                        if (!option) return;
                        onActorFilterChange(option.value || null);
                    }}
                    options={[{ label: t("all"), value: "" }, ...actorOptions]}
                />
            </div>
        </div>
    );
}

/**
 * Renders the action display title with support for Trans component interpolation
 * Handles translations with embedded components (e.g., links) for proper i18n support
 */
function ActionTitle({ actionDisplayTitle }: { actionDisplayTitle: TranslationWithParams }) {
    const { t } = useLocale();

    if (actionDisplayTitle.components?.length) {
        return (
            <ServerTrans
                t={t}
                i18nKey={actionDisplayTitle.key}
                values={actionDisplayTitle.params}
                components={actionDisplayTitle.components.map((comp) =>
                    comp.type === "link" ? (
                        <Link
                            key={comp.href}
                            href={comp.href}
                            className="text-emphasis underline hover:no-underline"
                        />
                    ) : (
                        <span key={comp.href} />
                    )
                )}
            />
        );
    }

    return <>{t(actionDisplayTitle.key, actionDisplayTitle.params)}</>;
}

interface JsonViewerProps {
    data: Record<string, unknown> | null;
}

function JsonViewer({ data }: JsonViewerProps) {
    if (!data || Object.keys(data).length === 0) {
        return null;
    }

    const jsonString = JSON.stringify(data, null, 2);
    const lines = jsonString.split("\n");
    const lineCount = lines.length;
    const lineNumberWidth = Math.max(2, Math.ceil(Math.log10(lineCount)) + 1);

    return (
        <div className="bg-default p-3 rounded-md text-[10px] overflow-x-auto font-mono">
            {lines.map((line, idx) => (
                <div key={idx} className="flex gap-2">
                    <span
                        className="text-subtle select-none text-right shrink-0"
                        style={{ minWidth: `${lineNumberWidth}ch` }}
                    >
                        {idx + 1}
                    </span>
                    <span className="text-default whitespace-pre">{line || " "}</span>
                </div>
            ))}
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
                const showJson = showJsonMap[log.id] || false;
                const actorRole = ACTOR_ROLE_LABEL_MAP[log.actor.type] ?? null;
                return (
                    <div key={log.id} className="flex gap-1">
                        <div className="flex flex-col items-center self-stretch">
                            <div className="pt-2 shrink-0">
                                <div className="bg-subtle rounded-[3.556px] p-1 flex items-center justify-center w-4 h-4">
                                    <Icon name={ACTION_ICON_MAP[log.action] ?? "sparkles"} className="h-3 w-3 text-subtle" />
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
                                            <ActionTitle actionDisplayTitle={log.actionDisplayTitle} />
                                        </h3>
                                        <div className="flex items-center gap-1 mt-1 text-xs text-subtle">
                                            {log.actor.displayAvatar && (
                                                <Avatar
                                                    size="xs"
                                                    imageSrc={log.actor.displayAvatar}
                                                    alt={log.actor.displayName || ""}
                                                />
                                            )}
                                            <span>
                                                {log.actor.displayName}
                                                {actorRole && <span>{` (${t(actorRole)})`}</span>}
                                            </span>
                                            <span>•</span>
                                            <span>{dayjs(log.timestamp).fromNow()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-3">
                                <div className="bg-muted rounded-lg border border-muted">
                                    <div className="py-1">
                                        <Button
                                            color="minimal"
                                            size="sm"
                                            onClick={() => toggleExpand(log.id)}
                                            StartIcon={isExpanded ? "chevron-down" : "chevron-right"}
                                            className="justify-start text-xs font-medium text-subtle h-6">
                                            {isExpanded ? t("hide_details") : t("show_details")}
                                        </Button>
                                    </div>

                                    {isExpanded && (
                                        <div className="bg-default rounded-lg m-0.5 text-xs">
                                            {/* Render displayFields if available, otherwise show type */}
                                            {log.displayFields && log.displayFields.length > 0 ? (
                                                log.displayFields.map((field, idx) => (
                                                    <div key={idx} className="flex items-start gap-2 py-2 border-b px-3 border-subtle">
                                                        <span className="font-medium text-emphasis min-w-[80px]">{t(field.labelKey)}</span>
                                                        <span className="text-[#096638] font-medium">{t(field.valueKey)}</span>
                                                    </div>
                                                ))
                                            ) : null}
                                            <div className="flex items-start gap-2 py-2 border-b px-3 border-subtle">
                                                <span className="font-medium text-emphasis min-w-[80px]">{t("actor")}</span>
                                                <span className="text-default">{log.actor.displayName || log.actor.type}</span>
                                            </div>
                                            <div className="flex items-start gap-2 py-2 border-b px-3 border-subtle">
                                                <span className="font-medium text-emphasis min-w-[80px]">{t("source")}</span>
                                                <span className="text-default">{log.source}</span>
                                            </div>
                                            <div className="flex items-start gap-2 py-2 px-3 border-b border-subtle">
                                                <span className="font-medium text-emphasis min-w-[80px]">
                                                    {t("timestamp")}
                                                </span>
                                                <span className="text-default">
                                                    {dayjs(log.timestamp).format("YYYY-MM-DD HH:mm:ss")}
                                                </span>
                                            </div>
                                            {log.displayJson && Object.keys(log.displayJson).length > 0 && (
                                                <div>
                                                    <div className="flex flex-col items-start gap-2 py-1 px-3 border-b border-subtle">
                                                        <Button
                                                            color="minimal"
                                                            size="sm"
                                                            onClick={() => toggleJson(log.id)}
                                                            StartIcon={showJson ? "chevron-down" : "chevron-right"}
                                                            className="-ml-3 h-6 px-2 font-medium text-xs">
                                                            {t("json")}
                                                        </Button>
                                                    </div>
                                                    <div>
                                                        {showJson && <JsonViewer data={log.displayJson} />}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function useBookingLogsFilters(
    auditLogs: AuditLog[],
    searchTerm: string,
    actorFilter: string | null
) {
    const filteredLogs = auditLogs.filter((log) => {
        const matchesSearch =
            !searchTerm ||
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.actor.displayName?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesActor = !actorFilter || log.actor.displayName === actorFilter;

        return matchesSearch && matchesActor;
    });

    const uniqueActorNames = Array.from(
        new Set(
            auditLogs
                .map((log) => log.actor.displayName)
                .filter((name): name is string => Boolean(name))
        )
    );

    const actorOptions = uniqueActorNames.map((actorName) => ({
        label: actorName,
        value: actorName,
    }));

    return { filteredLogs, actorOptions };
}

export default function BookingLogsView({ bookingUid }: BookingLogsViewProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [actorFilter, setActorFilter] = useState<string | null>(null);
    const { t } = useLocale();
    const { data, isLoading, error } = trpc.viewer.bookings.getAuditLogs.useQuery({
        bookingUid,
    });

    const auditLogs = data?.auditLogs || [];

    const { filteredLogs, actorOptions } = useBookingLogsFilters(
        auditLogs,
        searchTerm,
        actorFilter
    );

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

    return (
        <div className="space-y-6">
            <BookingLogsFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                actorFilter={actorFilter}
                onActorFilterChange={setActorFilter}
                actorOptions={actorOptions}
            />

            <BookingLogsTimeline logs={filteredLogs} />
        </div>
    );
}
