"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { PanelCard } from "@calcom/ui/components/card";
import { TextField, Select } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@calcom/ui/components/sheet";

// Database schema aligned types
type BookingAuditType = "RECORD_CREATED" | "RECORD_UPDATED" | "RECORD_DELETED";

type BookingAuditAction =
  | "rescheduled"
  | "attendee_removed"
  | "attendee_added"
  | "cancelled"
  | "no_show"
  | null;

// Raw database entry (what comes from API)
type DatabaseAuditEntry = {
  id: string; // UUID
  bookingId: string; // UUID
  userId: string | null; // UUID or null for system actions
  type: BookingAuditType; // DB enum
  action: BookingAuditAction; // Sub-action enum
  timestamp: Date; // Real DateTime
  data: Record<string, any> | null; // JSONB metadata
};

// UI-ready entry (after transformation)
type BookingAuditEntry = DatabaseAuditEntry & {
  // Computed fields for display
  displayText: string; // Generated from type + action + data
  actorName: string; // Resolved user name or "System"
  relativeTime: string; // "3h ago", "1d ago"
  icon: string; // UI icon name
  actorType: "user" | "system"; // Derived from userId
};

// Mock user data for resolution
type MockUser = {
  id: string;
  name: string;
  email: string;
};

// Mock users for userId resolution
const mockUsers: MockUser[] = [
  { id: "user-1", name: "John Townsend", email: "john@company.com" },
  { id: "user-2", name: "Addison Henry", email: "addison@guest.com" },
  { id: "user-3", name: "Marie Louise", email: "marie@company.com" },
];

// Raw database entries (aligned with schema)
const mockDatabaseAuditData: DatabaseAuditEntry[] = [
  {
    id: "audit-1",
    bookingId: "booking-123",
    userId: "user-1",
    type: "RECORD_DELETED",
    action: null,
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3h ago
    data: { wasRescheduled: true, totalUpdates: 2 },
  },
  {
    id: "audit-2",
    bookingId: "booking-123",
    userId: null, // System action
    type: "RECORD_UPDATED",
    action: "cancelled",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1d ago
    data: { reason: "no_show", autoTriggered: true },
  },
  {
    id: "audit-3",
    bookingId: "booking-123",
    userId: "user-1",
    type: "RECORD_UPDATED",
    action: "attendee_added",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1d ago
    data: { attendeeEmail: "marie@gmail.com", attendeeCountChange: 1 },
  },
  {
    id: "audit-4",
    bookingId: "booking-123",
    userId: "user-2",
    type: "RECORD_UPDATED",
    action: "rescheduled",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1d ago
    data: {
      from: "2025-03-18T10:00:00Z",
      to: "2025-03-19T10:00:00Z",
      reason: "guest_request",
    },
  },
  {
    id: "audit-5",
    bookingId: "booking-123",
    userId: null, // System action
    type: "RECORD_UPDATED",
    action: null,
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3d ago
    data: {
      webhookTriggered: true,
      integration: "salesforce",
      webhookUrl: "https://hooks.salesforce.com/...",
    },
  },
  {
    id: "audit-6",
    bookingId: "booking-123",
    userId: "user-1",
    type: "RECORD_CREATED",
    action: null,
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7d ago
    data: {
      scheduledTime: "2025-07-23T10:00:00Z",
      duration: 30,
      attendeeCount: 2,
    },
  },
];

// Utility functions for data transformation
function getUserName(userId: string): string {
  const user = mockUsers.find((u) => u.id === userId);
  return user?.name || "Unknown User";
}

function formatRelativeTime(timestamp: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

function generateDisplayText(
  type: BookingAuditType,
  action: BookingAuditAction,
  data: Record<string, any> | null
): string {
  switch (type) {
    case "RECORD_CREATED":
      return "Created booking";

    case "RECORD_DELETED":
      return "Deleted booking";

    case "RECORD_UPDATED":
      switch (action) {
        case "rescheduled":
          if (data?.from && data?.to) {
            const fromDate = new Date(data.from).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            const toDate = new Date(data.to).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return `Rescheduled call ${fromDate} → ${toDate}`;
          }
          return "Rescheduled call";

        case "attendee_added":
          return data?.attendeeEmail ? `Invited ${data.attendeeEmail}` : "Added attendee";

        case "attendee_removed":
          return "Removed attendee";

        case "cancelled":
          return data?.reason === "no_show" ? "Cancelled call" : "Cancelled call";

        default:
          if (data?.webhookTriggered) {
            return `Webhook situation`;
          }
          return "Updated booking";
      }

    default:
      return "Unknown action";
  }
}

function getAuditIcon(type: BookingAuditType, action: BookingAuditAction, data: any): string {
  switch (type) {
    case "RECORD_CREATED":
      return "plus-circle";
    case "RECORD_DELETED":
      return "edit-3";
    case "RECORD_UPDATED":
      switch (action) {
        case "rescheduled":
          return "edit-3";
        case "attendee_added":
          return "edit-3";
        case "attendee_removed":
          return "user-minus";
        case "cancelled":
          return "minus-circle";
        default:
          return data?.webhookTriggered ? "zap" : "edit-3";
      }
    default:
      return "help-circle";
  }
}

// Main transformation function
function transformAuditEntry(dbEntry: DatabaseAuditEntry): BookingAuditEntry {
  const actorName = dbEntry.userId ? getUserName(dbEntry.userId) : "Cal.com";
  const actorType = dbEntry.userId ? "user" : "system";

  return {
    ...dbEntry,
    displayText: generateDisplayText(dbEntry.type, dbEntry.action, dbEntry.data),
    actorName,
    actorType,
    relativeTime: formatRelativeTime(dbEntry.timestamp),
    icon: getAuditIcon(dbEntry.type, dbEntry.action, dbEntry.data),
  };
}

// Transform all mock data for UI consumption
const mockAuditData: BookingAuditEntry[] = mockDatabaseAuditData.map(transformAuditEntry);

type SelectOption = {
  label: string;
  value: string;
};

export default function BookingAuditPlayground() {
  const { t } = useLocale();
  const [selectedAudit, setSelectedAudit] = useState<BookingAuditEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [actorFilter, setActorFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"info" | "history">("history");
  const itemsPerPage = 10;

  // Updated filter options based on database schema
  const typeOptions: SelectOption[] = [
    { label: "All", value: "All" },
    { label: "Created", value: "RECORD_CREATED" },
    { label: "Updated", value: "RECORD_UPDATED" },
    { label: "Deleted", value: "RECORD_DELETED" },
  ];

  const actorOptions: SelectOption[] = [
    { label: "All", value: "All" },
    { label: "John Townsend", value: "John Townsend" },
    { label: "Addison Henry", value: "Addison Henry" },
    { label: "System", value: "Cal.com" },
  ];

  const filteredData = mockAuditData.filter((item) => {
    const matchesSearch = item.displayText.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "All" || item.type === typeFilter;
    const matchesActor = actorFilter === "All" || item.actorName.includes(actorFilter);
    return matchesSearch && matchesType && matchesActor;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openAuditSheet = (audit: BookingAuditEntry) => {
    setSelectedAudit(audit);
  };

  const closeAuditSheet = () => {
    setSelectedAudit(null);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Booking Audit Playground</h1>
        <p className="mt-2 text-gray-600">
          This page demonstrates the booking audit slide-over component with database-aligned mock data.
        </p>
      </div>

      {/* Mock Booking Header */}
      <div className="bg-default border-muted rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Elana x Marie Louise - Deel Demo</h2>
            <div className="text-subtle flex items-center gap-2 text-sm">
              <Icon name="calendar" className="h-4 w-4" />
              Thu, 13 June, 9:00am • 20 min
            </div>
          </div>
          <Button onClick={() => openAuditSheet(mockAuditData[0])}>View Audit</Button>
        </div>
      </div>

      {/* Audit Slide Over */}
      <Sheet open={!!selectedAudit} onOpenChange={(open) => !open && closeAuditSheet()}>
        <SheetContent className="w-[95vw] max-w-2xl">
          <SheetHeader>
            <SheetTitle>Elana x Marie Louise - Deel Demo</SheetTitle>
            <div className="text-subtle flex items-center gap-2 text-sm">
              <Icon name="calendar" className="h-4 w-4" />
              Thu, 13 June, 9:00am • 20 min
            </div>
          </SheetHeader>

          <div className="mt-6 flex-1 overflow-y-auto">
            {/* Tab Navigation */}
            <div className="border-subtle mb-6 flex rounded-lg border">
              <button
                className={`border-muted flex-1 rounded-l-lg border-r px-4 py-2 text-sm font-medium ${
                  activeTab === "info" ? "bg-subtle text-emphasis" : "bg-muted text-default hover:bg-subtle"
                }`}
                onClick={() => setActiveTab("info")}>
                Info
              </button>
              <button
                className={`flex-1 rounded-r-lg px-4 py-2 text-sm font-medium ${
                  activeTab === "history"
                    ? "bg-subtle text-emphasis"
                    : "bg-muted text-default hover:bg-subtle"
                }`}
                onClick={() => setActiveTab("history")}>
                History
              </button>
            </div>

            {/* History Tab Content */}
            {activeTab === "history" && (
              <>
                {/* Search and Filters */}
                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <TextField
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="col-span-1"
                    addOnLeading={<Icon name="search" className="h-4 w-4" />}
                  />
                  <Select<SelectOption>
                    placeholder="Type: All"
                    options={typeOptions}
                    value={typeOptions.find((opt) => opt.value === typeFilter)}
                    onChange={(selected) => setTypeFilter(selected?.value || "All")}
                  />
                  <Select<SelectOption>
                    placeholder="Actor: All"
                    options={actorOptions}
                    value={actorOptions.find((opt) => opt.value === actorFilter)}
                    onChange={(selected) => setActorFilter(selected?.value || "All")}
                  />
                </div>

                {/* Audit Entries */}
                <div className="relative">
                  {/* Vertical Timeline Line */}
                  <div className="bg-subtle absolute bottom-0 left-4 top-0 w-px" />

                  <div className="space-y-0">
                    {paginatedData.map((entry) => (
                      <div key={entry.id} className="relative flex">
                        {/* Icon with background */}
                        <div className="bg-default border-subtle relative z-10 flex h-8 w-8 items-center justify-center rounded-full border">
                          <Icon name={entry.icon as any} className="text-default h-4 w-4" />
                        </div>

                        {/* Content */}
                        <div className="ml-4 flex-1 pb-6">
                          {/* Action Text */}
                          <div className="mb-1">
                            <span className="text-emphasis text-sm font-medium">{entry.displayText}</span>
                          </div>

                          {/* Actor and Time */}
                          <div className="mb-2 flex items-center gap-2">
                            {entry.actorType === "user" ? (
                              <Avatar size="sm" alt={entry.actorName} />
                            ) : (
                              <div className="bg-subtle flex h-5 w-5 items-center justify-center rounded-full">
                                <Icon name="settings" className="h-3 w-3" />
                              </div>
                            )}
                            <span className="text-default text-sm">{entry.actorName}</span>
                            <span className="text-subtle text-sm">• {entry.relativeTime}</span>
                          </div>

                          {/* Collapsible Details using PanelCard */}
                          <PanelCard
                            title={({ collapsed }) =>
                              collapsed ? `${t("show")} ${t("details")}` : `${t("hide")} ${t("details")}`
                            }
                            className="m-0 border-0 bg-transparent p-0"
                            collapsible
                            defaultCollapsed={true}>
                            <div className="bg-muted mt-2 rounded-lg p-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="text-subtle">ID</div>
                                <div className="font-mono">{entry.id}</div>

                                <div className="text-subtle">Booking ID</div>
                                <div className="font-mono">{entry.bookingId}</div>

                                <div className="text-subtle">Actor</div>
                                <div>{entry.actorName}</div>

                                <div className="text-subtle">Type</div>
                                <div>{entry.type}</div>

                                {entry.action && (
                                  <>
                                    <div className="text-subtle">Action</div>
                                    <div>{entry.action}</div>
                                  </>
                                )}

                                <div className="text-subtle">Timestamp</div>
                                <div className="font-mono">{entry.timestamp.toISOString()}</div>
                              </div>

                              {entry.data && (
                                <div className="mt-4">
                                  <div className="text-subtle mb-2 text-sm">Data:</div>
                                  <pre className="bg-default text-subtle overflow-auto rounded p-2 text-xs">
                                    {JSON.stringify(entry.data, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {entry.data?.webhookTriggered && (
                                <div className="mt-4">
                                  <Button color="secondary" size="sm" StartIcon="external-link">
                                    View webhook logs
                                  </Button>
                                </div>
                              )}
                            </div>
                          </PanelCard>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="border-muted mt-6 flex items-center justify-between rounded-lg border p-4">
                    <div className="text-subtle text-sm">
                      Viewing 1-{Math.min(itemsPerPage, filteredData.length)} of {filteredData.length} results
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        color="secondary"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}>
                        Previous
                      </Button>
                      <Button
                        color="secondary"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}>
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Info Tab Content */}
            {activeTab === "info" && (
              <div className="text-subtle p-8 text-center">
                <p>Info tab content would go here</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Sample Data Display */}
      <div className="bg-muted mt-8 rounded-lg p-4">
        <h2 className="mb-2 text-lg font-semibold">Database-Aligned Sample Data:</h2>
        <div className="mb-4">
          <h3 className="text-sm font-semibold">Raw Database Entries:</h3>
          <pre className="text-subtle overflow-auto text-xs">
            {JSON.stringify(mockDatabaseAuditData, null, 2)}
          </pre>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Transformed UI Data:</h3>
          <pre className="text-subtle overflow-auto text-xs">{JSON.stringify(mockAuditData, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
