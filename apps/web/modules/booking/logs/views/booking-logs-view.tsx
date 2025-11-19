"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import dayjs from "@calcom/dayjs";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";
import { SkeletonText } from "@calcom/ui/components/skeleton";

interface BookingLogsViewProps {
    bookingUid: string;
}

const _actionColorMap: Record<string, string> = {
    CREATED: "blue",
    CANCELLED: "red",
    ACCEPTED: "green",
    REJECTED: "orange",
    RESCHEDULED: "purple",
    REASSIGNMENT: "yellow",
    ATTENDEE_ADDED: "green",
    ATTENDEE_REMOVED: "orange",
    LOCATION_CHANGED: "blue",
    HOST_NO_SHOW_UPDATED: "red",
    ATTENDEE_NO_SHOW_UPDATED: "red",
    RESCHEDULE_REQUESTED: "purple",
};

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
            return <Icon name="calendar" className="h-4 w-4" />;
        case "CANCELLED":
        case "REJECTED":
            return <Icon name="ban" className="h-4 w-4" />;
        case "ACCEPTED":
            return <Icon name="check" className="h-4 w-4" />;
        case "RESCHEDULED":
        case "RESCHEDULE_REQUESTED":
            return <Icon name="calendar" className="h-4 w-4" />;
        case "REASSIGNMENT":
        case "ATTENDEE_ADDED":
        case "ATTENDEE_REMOVED":
            return <Icon name="user" className="h-4 w-4" />;
        case "LOCATION_CHANGED":
            return <Icon name="map-pin" className="h-4 w-4" />;
        default:
            return <Icon name="settings" className="h-4 w-4" />;
    }
};

export default function BookingLogsView({ bookingUid }: BookingLogsViewProps) {
    const router = useRouter();
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState<string | null>(null);
    const [actorFilter, setActorFilter] = useState<string | null>(null);

    const { data, isLoading, error } = trpc.viewer.bookings.getAuditLogs.useQuery({
        bookingUid,
    });

    const toggleExpand = (logId: string) => {
        setExpandedLogId(expandedLogId === logId ? null : logId);
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

    return (
        <div className="space-y-6">
            {/* Header with Back Button */}
            <div className="flex items-center gap-4">
                <Button variant="icon" onClick={() => router.back()}>
                    <Icon name="arrow-left" className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-xl font-semibold">Booking History</h2>
                    <p className="text-sm text-gray-500">View all changes and events for this booking</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                <div>
                    <select
                        value={typeFilter || ""}
                        onChange={(e) => setTypeFilter(e.target.value || null)}
                        className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                        <option value="">Type: All</option>
                        {uniqueTypes.map((type) => (
                            <option key={type} value={type}>
                                {actionDisplayMap[type] || type}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <select
                        value={actorFilter || ""}
                        onChange={(e) => setActorFilter(e.target.value || null)}
                        className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                        <option value="">Actor: All</option>
                        {uniqueActorTypes.map((actorType) => (
                            <option key={actorType} value={actorType}>
                                {actorType}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Audit Log List */}
            <div className="space-y-3">
                {filteredLogs.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No audit logs found</p>
                    </div>
                ) : (
                    filteredLogs.map((log) => {
                        const isExpanded = expandedLogId === log.id;
                        const actionDisplay = actionDisplayMap[log.action] || log.action;

                        return (
                            <div
                                key={log.id}
                                className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                                {/* Log Header */}
                                <div className="flex items-start gap-4">
                                    {/* Icon */}
                                    <div className="flex-shrink-0 mt-1">{getActionIcon(log.action)}</div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <h3 className="font-medium text-gray-900">{actionDisplay}</h3>
                                                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Icon name="user" className="h-3.5 w-3.5" />
                                                        {log.actor.displayName}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        <Icon name="clock" className="h-3.5 w-3.5" />
                                                        {dayjs(log.timestamp).fromNow()}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => toggleExpand(log.id)}
                                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                                                {isExpanded ? (
                                                    <>
                                                        <Icon name="chevron-down" className="h-4 w-4" />
                                                        Hide details
                                                    </>
                                                ) : (
                                                    <>
                                                        <Icon name="chevron-right" className="h-4 w-4" />
                                                        Show details
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                            <div>
                                                <span className="font-medium text-gray-700">Type:</span>
                                                <span className="ml-2 text-gray-600">{log.type}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-700">Actor:</span>
                                                <span className="ml-2 text-gray-600">{log.actor.type}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-700">Timestamp:</span>
                                                <span className="ml-2 text-gray-600">
                                                    {dayjs(log.timestamp).format("YYYY-MM-DD HH:mm:ss")}
                                                </span>
                                            </div>
                                            {log.actor.displayEmail && (
                                                <div className="col-span-2">
                                                    <span className="font-medium text-gray-700">Actor Email:</span>
                                                    <span className="ml-2 text-gray-600">{log.actor.displayEmail}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Data JSON */}
                                        {log.data != null && (
                                            <div>
                                                <h4 className="font-medium text-gray-700 mb-2">Details:</h4>
                                                <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto text-gray-900">
                                                    {JSON.stringify(log.data, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Summary Stats */}
            <div className="border-t pt-4 mt-8">
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>
                        Showing {filteredLogs.length} of {auditLogs.length} log entries
                    </span>
                </div>
            </div>
        </div>
    );
}

