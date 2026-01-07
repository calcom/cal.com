"use client";

import type { WatchlistType } from "@calcom/prisma/enums";

export type BlocklistScope = "organization" | "system";

export interface BlocklistPermissions {
  canRead: boolean;
  canCreate: boolean;
  canDelete: boolean;
}

export interface BlocklistEntry {
  id: string;
  value: string;
  type: WatchlistType;
  description: string | null;
  source?: string;
  isGlobal?: boolean;
  isReadOnly?: boolean;
  latestAudit?: {
    changedByUserId: number | null;
    changedByUser?: { id: number; email: string; name: string | null };
  } | null;
}

export interface BlocklistEntryDetails {
  entry: {
    id: string;
    value: string;
    type: WatchlistType;
    description: string | null;
    source?: string;
    bookingReports?: Array<{
      booking: {
        uid: string;
        title: string | null;
      };
    }>;
  };
  auditHistory: Array<{
    id: string;
    value: string;
    changedAt: Date | string;
    changedByUser?: { name: string | null; email: string } | null;
  }>;
}

export interface BookingReport {
  id: string;
  bookerEmail: string;
  reason: string;
  description: string | null;
  reporter?: { email: string } | null;
  booking: {
    uid: string;
    title: string | null;
  };
  organization?: { name: string } | null;
}

export interface GroupedBookingReport extends BookingReport {
  reportCount: number;
  reports: BookingReport[];
}

export interface CreateBlocklistEntryFormData {
  type: WatchlistType;
  value: string;
  description?: string;
}
