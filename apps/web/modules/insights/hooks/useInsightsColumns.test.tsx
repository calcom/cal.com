import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useInsightsColumns } from "./useInsightsColumns";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (text: string) => text,
  }),
}));

vi.mock("@calcom/lib/constants", () => ({
  WEBAPP_URL: "https://app.cal.com",
}));

vi.mock("@calcom/lib/hooks/useCopy", () => ({
  useCopy: () => ({
    copyToClipboard: vi.fn(),
    isCopied: false,
  }),
}));

vi.mock("@calcom/features/data-table", () => ({
  ColumnFilterType: {
    MULTI_SELECT: "MULTI_SELECT",
    SINGLE_SELECT: "SINGLE_SELECT",
    TEXT: "TEXT",
    NUMBER: "NUMBER",
  },
}));

vi.mock("@calcom/routing-forms/lib/FieldTypes", () => ({
  RoutingFormFieldType: {
    TEXT: "TEXT",
    EMAIL: "EMAIL",
    PHONE: "PHONE",
    TEXTAREA: "TEXTAREA",
    NUMBER: "NUMBER",
    SINGLE_SELECT: "SINGLE_SELECT",
    MULTI_SELECT: "MULTI_SELECT",
  },
}));

vi.mock("@calcom/dayjs", () => ({
  default: (d: string) => ({
    format: () => d,
  }),
}));

vi.mock("@calcom/ui/components/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@calcom/ui/components/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("../components/BookedByCell", () => ({
  BookedByCell: () => null,
}));

vi.mock("../components/BookingAtCell", () => ({
  BookingAtCell: () => null,
}));

vi.mock("../components/BookingStatusBadge", () => ({
  BookingStatusBadge: () => null,
}));

vi.mock("../components/ResponseValueCell", () => ({
  ResponseValueCell: () => null,
}));

vi.mock("@calcom/web/modules/insights/lib/types", () => ({
  ZResponseMultipleValues: { safeParse: vi.fn() },
  ZResponseSingleValue: { safeParse: vi.fn() },
  ZResponseTextValue: { safeParse: vi.fn() },
  ZResponseNumericValue: { safeParse: vi.fn() },
}));

type MockHeaderRow = {
  id: string;
  label: string;
  type: string;
  options?: Array<{ id: string | null; label: string }>;
};

describe("useInsightsColumns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty columns when isHeadersSuccess is false", () => {
    const { result } = renderHook(() =>
      useInsightsColumns({ headers: undefined, isHeadersSuccess: false })
    );
    expect(result.current).toEqual([]);
  });

  it("should return column definitions when isHeadersSuccess is true", () => {
    const { result } = renderHook(() =>
      useInsightsColumns({
        headers: [] as unknown as Parameters<typeof useInsightsColumns>[0]["headers"],
        isHeadersSuccess: true,
      })
    );
    expect(result.current.length).toBeGreaterThan(0);
  });

  it("should include static columns like formId, bookingUserId, bookingUid", () => {
    const { result } = renderHook(() =>
      useInsightsColumns({
        headers: [] as unknown as Parameters<typeof useInsightsColumns>[0]["headers"],
        isHeadersSuccess: true,
      })
    );
    const columnIds = result.current.map((col) => (col as { id?: string }).id).filter(Boolean);
    expect(columnIds).toContain("formId");
    expect(columnIds).toContain("bookingUserId");
    expect(columnIds).toContain("bookingUid");
    expect(columnIds).toContain("bookingStatusOrder");
    expect(columnIds).toContain("bookingCreatedAt");
  });

  it("should generate dynamic columns from headers", () => {
    const headers: MockHeaderRow[] = [
      { id: "field-1", label: "department", type: "SINGLE_SELECT", options: [{ id: "opt-1", label: "Eng" }] },
      { id: "field-2", label: "notes", type: "TEXT", options: [] },
    ];
    const { result } = renderHook(() =>
      useInsightsColumns({
        headers: headers as unknown as Parameters<typeof useInsightsColumns>[0]["headers"],
        isHeadersSuccess: true,
      })
    );
    const columnIds = result.current.map((col) => (col as { id?: string }).id).filter(Boolean);
    expect(columnIds).toContain("field-1");
    expect(columnIds).toContain("field-2");
  });

  it("should include UTM columns", () => {
    const { result } = renderHook(() =>
      useInsightsColumns({
        headers: [] as unknown as Parameters<typeof useInsightsColumns>[0]["headers"],
        isHeadersSuccess: true,
      })
    );
    const columnIds = result.current.map((col) => (col as { id?: string }).id).filter(Boolean);
    expect(columnIds).toContain("utm_source");
    expect(columnIds).toContain("utm_medium");
    expect(columnIds).toContain("utm_campaign");
  });
});
