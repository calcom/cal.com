import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseSession = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: (...args: unknown[]) => mockUseSession(...args),
}));

vi.mock("@calcom/ui/components/skeleton", () => ({
  SkeletonContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SkeletonText: () => <div data-testid="skeleton-text" />,
}));

vi.mock("./compliance/ComplianceDocumentCard", () => ({
  ComplianceDocumentCard: ({
    document,
    hasAccess,
  }: {
    document: { id: string; name: string };
    hasAccess: boolean;
  }) => (
    <div data-testid={`doc-card-${document.id}`} data-has-access={hasAccess}>
      {document.name}
    </div>
  ),
}));

vi.mock("./compliance/compliance-documents", () => ({
  DOCUMENT_CATEGORIES: { DPA: "dpa", REPORTS: "reports", OTHER: "other" },
  COMPLIANCE_DOCUMENTS: [
    {
      id: "dpa",
      name: "dpa_doc",
      description: "dpa_desc",
      source: { type: "url", url: "https://example.com" },
      category: "dpa",
      restricted: false,
    },
    {
      id: "soc2",
      name: "soc2_doc",
      description: "soc2_desc",
      source: { type: "b2", fileName: "SOC2.pdf" },
      category: "reports",
      restricted: true,
    },
    {
      id: "pentest",
      name: "pentest_doc",
      description: "pentest_desc",
      source: { type: "b2", fileName: "pentest.pdf" },
      category: "other",
      restricted: true,
    },
  ],
}));

describe("ComplianceView", async () => {
  const ComplianceView = (await import("./compliance-view")).default;
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render skeleton when session is loading", () => {
    mockUseSession.mockReturnValue({
      status: "loading",
      data: null,
      update: vi.fn(),
    });

    render(<ComplianceView />);
    expect(screen.getAllByTestId("skeleton-text").length).toBeGreaterThan(0);
  });

  it("should render all three document category sections", () => {
    mockUseSession.mockReturnValue({
      status: "authenticated",
      data: { user: { org: { id: undefined } } },
      update: vi.fn(),
    });

    render(<ComplianceView />);
    expect(screen.getByText("data_privacy")).toBeInTheDocument();
    expect(screen.getByText("compliance_reports")).toBeInTheDocument();
    expect(screen.getByText("other_documents")).toBeInTheDocument();
  });

  it("should render document cards for each document", () => {
    mockUseSession.mockReturnValue({
      status: "authenticated",
      data: { user: { org: { id: undefined } } },
      update: vi.fn(),
    });

    render(<ComplianceView />);
    expect(screen.getByTestId("doc-card-dpa")).toBeInTheDocument();
    expect(screen.getByTestId("doc-card-soc2")).toBeInTheDocument();
    expect(screen.getByTestId("doc-card-pentest")).toBeInTheDocument();
  });

  it("should grant access to unrestricted docs for users without org", () => {
    mockUseSession.mockReturnValue({
      status: "authenticated",
      data: { user: { org: { id: undefined } } },
      update: vi.fn(),
    });

    render(<ComplianceView />);
    expect(screen.getByTestId("doc-card-dpa")).toHaveAttribute("data-has-access", "true");
  });

  it("should deny access to restricted docs for users without org", () => {
    mockUseSession.mockReturnValue({
      status: "authenticated",
      data: { user: { org: { id: undefined } } },
      update: vi.fn(),
    });

    render(<ComplianceView />);
    expect(screen.getByTestId("doc-card-soc2")).toHaveAttribute("data-has-access", "false");
    expect(screen.getByTestId("doc-card-pentest")).toHaveAttribute("data-has-access", "false");
  });

  it("should grant access to restricted docs for org users", () => {
    mockUseSession.mockReturnValue({
      status: "authenticated",
      data: { user: { org: { id: 1 } } },
      update: vi.fn(),
    });

    render(<ComplianceView />);
    expect(screen.getByTestId("doc-card-soc2")).toHaveAttribute("data-has-access", "true");
    expect(screen.getByTestId("doc-card-pentest")).toHaveAttribute("data-has-access", "true");
    expect(screen.getByTestId("doc-card-dpa")).toHaveAttribute("data-has-access", "true");
  });
});
