import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useWrongAssignmentColumns } from "./useWrongAssignmentColumns";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (text: string) => text,
  }),
}));

vi.mock("@calcom/features/data-table", () => ({
  ColumnFilterType: {
    SINGLE_SELECT: "SINGLE_SELECT",
  },
}));

vi.mock("@calcom/prisma/enums", () => ({
  WrongAssignmentReportStatus: {
    PENDING: "PENDING",
    REVIEWED: "REVIEWED",
    RESOLVED: "RESOLVED",
    DISMISSED: "DISMISSED",
  },
}));

vi.mock("@calcom/ui/components/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => children,
}));

describe("useWrongAssignmentColumns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return column definitions", () => {
    const { result } = renderHook(() => useWrongAssignmentColumns());
    expect(result.current.length).toBeGreaterThan(0);
  });

  it("should include filterable columns routingFormId and reportedById", () => {
    const { result } = renderHook(() => useWrongAssignmentColumns());
    const columnIds = result.current.map((col) => (col as { id?: string }).id).filter(Boolean);
    expect(columnIds).toContain("routingFormId");
    expect(columnIds).toContain("reportedById");
  });

  it("should include display columns for booking, status, createdAt, reviewedBy", () => {
    const { result } = renderHook(() => useWrongAssignmentColumns());
    const columnIds = result.current.map((col) => (col as { id?: string }).id).filter(Boolean);
    expect(columnIds).toContain("booking");
    expect(columnIds).toContain("status");
    expect(columnIds).toContain("createdAt");
    expect(columnIds).toContain("reviewedBy");
  });

  it("should include columns for routing form name, reporter, correct assignee, and notes", () => {
    const { result } = renderHook(() => useWrongAssignmentColumns());
    const columnIds = result.current.map((col) => (col as { id?: string }).id).filter(Boolean);
    expect(columnIds).toContain("routingFormName");
    expect(columnIds).toContain("reportedByName");
    expect(columnIds).toContain("correctAssignee");
    expect(columnIds).toContain("additionalNotes");
  });

  it("should have filtering disabled on display columns", () => {
    const { result } = renderHook(() => useWrongAssignmentColumns());
    const bookingCol = result.current.find((col) => (col as { id?: string }).id === "booking");
    expect(bookingCol).toBeDefined();
    // Display columns should have enableColumnFilter: false
    expect((bookingCol as { enableColumnFilter?: boolean }).enableColumnFilter).toBe(false);
  });

  it("should return consistent column count across re-renders", () => {
    const { result, rerender } = renderHook(() => useWrongAssignmentColumns());
    const firstLength = result.current.length;
    rerender();
    expect(result.current.length).toBe(firstLength);
  });
});
