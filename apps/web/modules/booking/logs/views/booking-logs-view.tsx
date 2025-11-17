"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import dayjs from "@calcom/dayjs";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { FilterSearchField, Select } from "@calcom/ui/components/form";

interface BookingLogsViewProps {
    bookingUid: string;
}

const actionDisplayMap: Record<string, string> = {
    CREATED: "Created",
    CANCELLED: "Cancelled call",
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
    RESCHEDULED: "Rescheduled call",
    REASSIGNMENT: "Assigned",
    ATTENDEE_ADDED: "Invited",
    ATTENDEE_REMOVED: "Removed attendee",
    LOCATION_CHANGED: "Location changed",
    HOST_NO_SHOW_UPDATED: "Host no-show updated",
    ATTENDEE_NO_SHOW_UPDATED: "Attendee no-show updated",
    RESCHEDULE_REQUESTED: "Reschedule requested",
};

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

export default function BookingLogsView({ bookingUid }: BookingLogsViewProps) {
    const router = useRouter();
    const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState<string | null>(null);
    const [actorFilter, setActorFilter] = useState<string | null>(null);
    const [showJsonMap, setShowJsonMap] = useState<Record<string, boolean>>({});

    const { data, isLoading, error } = trpc.viewer.bookings.getAuditLogs.useQuery({
        bookingUid,
    });

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

    if (error) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <p className="text-red-600 font-medium">Error loading booking logs</p>
                    <p className="text-sm text-gray-500 mt-2">{error.message}</p>
                    <Button className="mt-4" onClick={() => router.back()}>
                        Go Back
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
        label: actionDisplayMap[type] || type,
        value: type,
    }));

    const actorOptions = uniqueActorTypes.map((actorType) => ({
        label: actorType,
        value: actorType,
    }));

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
                <div className="flex-1 min-w-[200px]">
                    <FilterSearchField
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        containerClassName=""
                    />
                </div>

                <div className="min-w-[140px]">
                    <Select
                        size="sm"
                        value={typeFilter ? { label: `Type: ${actionDisplayMap[typeFilter] || typeFilter}`, value: typeFilter } : { label: "Type: All", value: "" }}
                        onChange={(option) => {
                            const singleOption = option as { value: string; label: string } | null;
                            setTypeFilter(singleOption?.value || null);
                        }}
                        options={[{ label: "Type: All", value: "" }, ...typeOptions.map(opt => ({ ...opt, label: `Type: ${opt.label}` }))]}
                    />
                </div>

                <div className="min-w-[140px]">
                    <Select
                        size="sm"
                        value={actorFilter ? { label: `Actor: ${actorFilter}`, value: actorFilter } : { label: "Actor: All", value: "" }}
                        onChange={(option) => {
                            const singleOption = option as { value: string; label: string } | null;
                            setActorFilter(singleOption?.value || null);
                        }}
                        options={[{ label: "Actor: All", value: "" }, ...actorOptions.map(opt => ({ ...opt, label: `Actor: ${opt.label}` }))]}
                    />
                </div>
            </div>

            {/* Audit Log List with Timeline */}
            <div className="flex gap-1">
                {/* Timeline Column */}
                <div className="flex flex-col items-center pt-2">
                    {filteredLogs.length === 0 ? null : (
                        <>
                            {filteredLogs.map((log, index) => {
                                const isLast = index === filteredLogs.length - 1;
                                const isExpanded = expandedLogIds.has(log.id);
                                const hasData = log.data != null && Object.keys(log.data).length > 0;

                                // Calculate height based on expanded state
                                const baseHeight = 84;
                                const expandedHeight = isExpanded ? (hasData ? 200 : 120) : 0;
                                const totalHeight = baseHeight + expandedHeight;

                                return (
                                    <div key={log.id} className="flex flex-col items-center">
                                        {/* Icon Container */}
                                        <div className="bg-subtle rounded-[3.556px] p-1 flex items-center justify-center w-4 h-4 shrink-0">
                                            <Icon name={getActionIcon(log.action)} className="h-3 w-3 text-subtle" />
                                        </div>

                                        {/* Connecting Line */}
                                        {!isLast && (
                                            <div
                                                className="w-px bg-subtle"
                                                style={{ height: `${totalHeight}px` }}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>

                {/* Log Cards Column */}
                <div className="flex-1 space-y-0.5">
                    {filteredLogs.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-muted">No audit logs found</p>
                        </div>
                    ) : (
                        filteredLogs.map((log) => {
                            const isExpanded = expandedLogIds.has(log.id);
                            const actionDisplay = actionDisplayMap[log.action] || log.action;
                            const showJson = showJsonMap[log.id] || false;

                            return (
                                <div key={log.id} className="rounded-lg py-2">
                                    {/* Log Header */}
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

                                    {/* Show/Hide Details Button */}
                                    <div className="px-3">
                                        <div className="bg-muted rounded-[10px] py-1">
                                            <Button
                                                color="minimal"
                                                size="sm"
                                                onClick={() => toggleExpand(log.id)}
                                                StartIcon={isExpanded ? "chevron-down" : "chevron-right"}
                                                className="w-full justify-start text-xs font-medium text-subtle h-6">
                                                {isExpanded ? "Hide details" : "Show details"}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="mt-2 px-3">
                                            <div className="space-y-2 text-xs">
                                                <div className="flex items-start gap-2">
                                                    <span className="font-medium text-emphasis min-w-[80px]">Type</span>
                                                    <span className="text-default">{log.type}</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <span className="font-medium text-emphasis min-w-[80px]">Actor</span>
                                                    <span className="text-default">{log.actor.type}</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <span className="font-medium text-emphasis min-w-[80px]">
                                                        Timestamp
                                                    </span>
                                                    <span className="text-default">
                                                        {dayjs(log.timestamp).format("YYYY-MM-DD HH:mm:ss")}
                                                    </span>
                                                </div>
                                                {log.linkedBookingUid && (
                                                    <div className="flex items-start gap-2">
                                                        <span className="font-medium text-emphasis min-w-[80px]">
                                                            Linked Booking
                                                        </span>
                                                        <span className="text-default">
                                                            {log.linkedBookingUid}
                                                            {log.action === "RESCHEDULED" && " (new booking)"}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* JSON Data */}
                                                {log.data != null && Object.keys(log.data).length > 0 && (
                                                    <div className="pt-2">
                                                        <Button
                                                            color="minimal"
                                                            size="sm"
                                                            onClick={() => toggleJson(log.id)}
                                                            StartIcon={showJson ? "chevron-down" : "chevron-right"}
                                                            className="mb-1 h-6 px-0 font-medium">
                                                            JSON
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
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

